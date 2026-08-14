"""Tests for XTB report import (stdlib xlsx reader)."""

from __future__ import annotations

import io
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

import pytest

REPO = Path(__file__).resolve().parents[1]
TOOLS = REPO / "tools"
sys.path.insert(0, str(TOOLS))

from import_xtb_report_symbols import (  # noqa: E402
    collect_from_reports,
    find_sheet_header,
    iter_sheet_rows,
    load_catalog_symbols,
    missing_instruments,
    report_missing,
    sha256,
)

NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"

SEED_HEADER = (
    "xtb_symbol,xtb_name,yahoo_symbol,name,asset_class,instrument_type,"
    "exchange,quote_currency,point_size,price_divisor,enabled"
)
SEED_ROWS = """ABEA.DE,Alphabet Inc - class A,ABEA.DE,Alphabet,STOCK,REAL,XETRA,EUR,0.01,1,true
NVD.DE,NVIDIA Corp,NVD.DE,NVIDIA,STOCK,REAL,XETRA,EUR,0.01,1,true
TSLA.DE,Tesla Inc.,TL0.DE,Tesla,STOCK,REAL,XETRA,EUR,0.01,1,true
S0LR.DE,Invesco Solar Energy UCITS ETF,S0LR.DE,Solar,ETF,REAL,XETRA,EUR,0.01,1,true
XAD6.DE,Xtrackers Physical Silver ETC,XAD6.DE,Silver,ETC,REAL,XETRA,EUR,0.01,1,true
IDR.ES,Indra Sistemas SA,IDR.MC,Indra,STOCK,REAL,BME Madrid,EUR,0.01,1,true
AAPL.US,Apple Inc CFD,AAPL,Apple,STOCK,CFD,NASDAQ,USD,0.01,1,true
GLD.US,SPDR Gold Shares CFD,GLD,Gold,ETF,CFD,NYSE Arca,USD,0.01,1,false"""


@pytest.fixture
def seed_catalog(tmp_path: Path) -> Path:
    path = tmp_path / "symbols.csv"
    path.write_text(f"{SEED_HEADER}\n{SEED_ROWS}\n", encoding="utf-8")
    return path


def _col_ref(col: str, row: int) -> str:
    return f"{col}{row}"


def _inline_cell(col: str, row: int, value: str) -> ET.Element:
    cell = ET.Element(f"{{{NS}}}c", r=_col_ref(col, row))
    v = ET.SubElement(cell, f"{{{NS}}}v")
    v.text = value
    return cell


def _shared_cell(col: str, row: int, index: int) -> ET.Element:
    cell = ET.Element(f"{{{NS}}}c", r=_col_ref(col, row), t="s")
    v = ET.SubElement(cell, f"{{{NS}}}v")
    v.text = str(index)
    return cell


def _build_xlsx(*sheets: tuple[str, list[list[tuple[str, str | int]]]]) -> bytes:
    shared: list[str] = []
    shared_index: dict[str, int] = {}

    def ss(text: str) -> int:
        if text not in shared_index:
            shared_index[text] = len(shared)
            shared.append(text)
        return shared_index[text]

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        if shared:
            sst = ET.Element(
                f"{{{NS}}}sst",
                xmlns=NS,
                count=str(len(shared)),
                uniqueCount=str(len(shared)),
            )
            for text in shared:
                si = ET.SubElement(sst, f"{{{NS}}}si")
                t = ET.SubElement(si, f"{{{NS}}}t")
                t.text = text
            zf.writestr(
                "xl/sharedStrings.xml",
                ET.tostring(sst, encoding="utf-8", xml_declaration=True),
            )

        sheet_entries: list[tuple[str, str]] = []
        for idx, (name, rows) in enumerate(sheets, start=1):
            sheet_data = ET.Element(f"{{{NS}}}worksheet", xmlns=NS)
            data_el = ET.SubElement(sheet_data, f"{{{NS}}}sheetData")
            for row_idx, row_cells in enumerate(rows, start=1):
                row_el = ET.SubElement(data_el, f"{{{NS}}}row", r=str(row_idx))
                for col, value in row_cells:
                    if isinstance(value, int):
                        row_el.append(_shared_cell(col, row_idx, value))
                    elif shared:
                        row_el.append(_shared_cell(col, row_idx, ss(value)))
                    else:
                        row_el.append(_inline_cell(col, row_idx, value))
            target = f"xl/worksheets/sheet{idx}.xml"
            zf.writestr(
                target,
                ET.tostring(sheet_data, encoding="utf-8", xml_declaration=True),
            )
            sheet_entries.append((name, target))

        workbook = ET.Element(
            f"{{{NS}}}workbook",
            xmlns=NS,
            **{"xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"},
        )
        sheets_el = ET.SubElement(workbook, f"{{{NS}}}sheets")
        rel_parts = [
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
        ]
        for idx, (name, _target) in enumerate(sheet_entries, start=1):
            rid = f"rId{idx}"
            ET.SubElement(
                sheets_el,
                f"{{{NS}}}sheet",
                name=name,
                sheetId=str(idx),
                **{"{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id": rid},
            )
            rel_parts.append(
                f'<Relationship Id="{rid}" '
                f'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
                f'Target="worksheets/sheet{idx}.xml"/>'
            )
        rel_parts.append("</Relationships>")
        zf.writestr(
            "xl/workbook.xml",
            ET.tostring(workbook, encoding="utf-8", xml_declaration=True),
        )
        zf.writestr("xl/_rels/workbook.xml.rels", "".join(rel_parts))
        zf.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/worksheets/sheet1.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            "</Types>",
        )
    return buf.getvalue()


def _write_workbook(path: Path, *sheets) -> None:
    path.write_bytes(_build_xlsx(*sheets))


class TestHeaderDetection:
    def test_finds_header_at_non_default_row_and_column(self, tmp_path):
        rows = [
            [("A", "meta"), ("B", "ignored")],
            [("B", "Instrument"), ("D", "Ticker"), ("E", "Category")],
            [("B", "Alpha ETF"), ("D", "AAA.DE"), ("E", "ETF")],
        ]
        path = tmp_path / "shifted.xlsx"
        _write_workbook(path, ("Sheet1", rows))
        header = find_sheet_header(iter_sheet_rows(path)[0][1])
        assert header is not None
        assert header.instrument_col == "B"
        assert header.ticker_col == "D"
        assert header.category_col == "E"


class TestCollection:
    def test_deduplicates_across_sheets_and_files(self, tmp_path):
        book1 = [
            [("A", "Instrument"), ("B", "Ticker"), ("C", "Category"), ("F", "Open Price")],
            [("A", "Robotics"), ("B", "2B76.DE"), ("C", "ETF"), ("F", "10.123")],
        ]
        book2 = [
            [("B", "Instrument"), ("C", "Ticker"), ("D", "Category"), ("G", "Close Price")],
            [("B", "Robotics"), ("C", "2B76.DE"), ("D", "ETF"), ("G", "10.456")],
        ]
        _write_workbook(tmp_path / "a.xlsx", ("Closed", book1))
        _write_workbook(tmp_path / "b.xlsx", ("Cash", book2))
        collected = collect_from_reports(tmp_path)
        assert list(collected.instruments) == ["2B76.DE"]
        assert collected.instruments["2B76.DE"].name == "Robotics"
        assert collected.instruments["2B76.DE"].max_price_decimals == 3

    def test_skips_rows_without_ticker(self, tmp_path):
        rows = [
            [("A", "Instrument"), ("B", "Ticker"), ("C", "Category")],
            [("A", "Deposit"), ("B", ""), ("C", "")],
            [("A", "Robotics"), ("B", "2B76.DE"), ("C", "ETF")],
        ]
        _write_workbook(tmp_path / "one.xlsx", ("Sheet", rows))
        collected = collect_from_reports(tmp_path)
        assert list(collected.instruments) == ["2B76.DE"]

    def test_numeric_instrument_cell_uses_holding_name(self, tmp_path):
        rows = [
            [("B", "Instrument/Position"), ("C", "Ticker"), ("D", "Category"), ("H", "Current price")],
            [("B", "AI & Power Infrastructure"), ("C", "A1P0.DE"), ("D", "ETF"), ("H", "7.847")],
            [("B", "2613329144"), ("C", "A1P0.DE"), ("D", ""), ("H", "7.847")],
        ]
        _write_workbook(tmp_path / "open.xlsx", ("Open Positions", rows))
        collected = collect_from_reports(tmp_path)
        assert collected.instruments["A1P0.DE"].name == "AI & Power Infrastructure"

    def test_missing_from_seed_catalog(self, seed_catalog):
        reports = REPO / "data" / "xtb-reports"
        collected = collect_from_reports(reports)
        missing = missing_instruments(collected, load_catalog_symbols(seed_catalog))
        tickers = {inst.ticker for inst in missing}
        assert len(collected.instruments) == 41
        assert len(tickers) == 38
        assert tickers == {
            "2B76.DE", "2B79.DE", "2B7C.DE", "3USL.UK", "4MMR.DE", "A1P0.DE", "AAKI.DE",
            "ASWC.DE", "BLC.FR", "BTCE.DE", "C8PX.DE", "CA.FR", "CBUK.DE", "CD91.DE",
            "COPX.UK", "DFNC.DE", "DRON.DE", "ED3F.DE", "EEMU.FR", "ETLX.DE", "FTGA.DE",
            "FVSJ.DE", "H4ZP.DE", "IBCJ.DE", "ICNT.DE", "IS0E.DE", "ISAE.NL", "JMLP.DE",
            "LHTC.DE", "LI7U.DE", "NESTE.FI", "OOEA.DE", "S5SD.DE", "SPYN.DE", "SXR2.DE",
            "V.US", "V9N.DE", "WTEH.DE",
        }
        assert {"TSLA.DE", "S0LR.DE", "XAD6.DE"}.isdisjoint(tickers)

    def test_a1p0_reported_once_with_display_name(self, seed_catalog):
        reports = REPO / "data" / "xtb-reports"
        collected = collect_from_reports(reports)
        assert collected.instruments["A1P0.DE"].name == "AI & Power Infrastructure"
        buf = io.StringIO()
        report_missing(reports, seed_catalog, stream=buf)
        output = buf.getvalue()
        assert output.count("A1P0.DE") >= 1
        assert "2613329144" not in output

    def test_catalog_hash_unchanged_after_report(self, seed_catalog):
        reports = REPO / "data" / "xtb-reports"
        before = sha256(seed_catalog)
        report_missing(reports, seed_catalog)
        assert sha256(seed_catalog) == before

    def test_existing_only_in_catalog_not_in_missing(self, seed_catalog):
        reports = REPO / "data" / "xtb-reports"
        collected = collect_from_reports(reports)
        missing = missing_instruments(collected, load_catalog_symbols(seed_catalog))
        missing_tickers = {m.ticker for m in missing}
        for symbol in ("ABEA.DE", "NVD.DE", "IDR.ES", "AAPL.US", "GLD.US"):
            assert symbol not in missing_tickers
            assert symbol not in collected.instruments

    def test_complete_catalog_reports_nothing_missing(self):
        reports = REPO / "data" / "xtb-reports"
        catalog = REPO / "data" / "symbols.csv"
        _, missing = report_missing(reports, catalog, stream=io.StringIO())
        assert missing == []
