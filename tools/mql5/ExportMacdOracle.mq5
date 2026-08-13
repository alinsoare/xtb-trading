//+------------------------------------------------------------------+
//|                                            ExportMacdOracle.mq5  |
//|  Dumps OHLC bars and SimpleMACD buffers for MACD parity fixtures.|
//|  Dev-time oracle tooling only.                                   |
//+------------------------------------------------------------------+
//| EXPORT PROCEDURE (run by hand in MT5-Testing):                   |
//|  1. Open a chart for the instrument and timeframe.               |
//|  2. Run this script on the chart.                                |
//|  3. JSON lands in MQL5/Files/macd_oracle/                        |
//|  4. Copy the JSON into tests/fixtures/macd/                      |
//+------------------------------------------------------------------+
#property copyright "Alin Soare"
#property version   "1.00"
#property script_show_inputs

input string InpSubdir = "macd_oracle"; // Output subdirectory under MQL5/Files
input int    InpFastPeriod   = 13;      // Fast EMA period
input int    InpSlowPeriod   = 34;      // Slow EMA period
input int    InpSignalPeriod = 9;       // Signal EMA period

#define BUF_MAIN    0
#define BUF_SIGNAL  1
#define BUF_HIST    2

//+------------------------------------------------------------------+
string Tag()
  {
   return _Symbol + "_" + EnumToString((ENUM_TIMEFRAMES)Period());
  }

//+------------------------------------------------------------------+
bool EnsureDir(const string subdir)
  {
   if(!FolderCreate(subdir, 0))
     {
      // May already exist.
     }
   return true;
  }

//+------------------------------------------------------------------+
string JsonEscape(const string s)
  {
   string out = s;
   StringReplace(out, "\\", "\\\\");
   StringReplace(out, "\"", "\\\"");
   return out;
  }

//+------------------------------------------------------------------+
void OnStart()
  {
   const int rates_total = Bars(_Symbol, PERIOD_CURRENT);
   if(rates_total < InpSlowPeriod + InpSignalPeriod)
     {
      Print("ExportMacdOracle: too few bars (need ", InpSlowPeriod + InpSignalPeriod, ")");
      return;
     }

   const int handle = iCustom(_Symbol, PERIOD_CURRENT, "SimpleMACD",
                              InpFastPeriod, InpSlowPeriod, InpSignalPeriod,
                              true, PRICE_TYPICAL);
   if(handle == INVALID_HANDLE)
     {
      Print("ExportMacdOracle: iCustom failed, err=", GetLastError());
      return;
     }

   if(BarsCalculated(handle) < rates_total)
     {
      Print("ExportMacdOracle: indicator not ready, calculated=",
            BarsCalculated(handle), " total=", rates_total);
      return;
     }

   MqlRates rates[];
   if(CopyRates(_Symbol, PERIOD_CURRENT, 0, rates_total, rates) < rates_total)
     {
      Print("ExportMacdOracle: CopyRates failed, err=", GetLastError());
      IndicatorRelease(handle);
      return;
     }

   double mainBuf[], signalBuf[], histBuf[];
   if(CopyBuffer(handle, BUF_MAIN, 0, rates_total, mainBuf) < rates_total ||
      CopyBuffer(handle, BUF_SIGNAL, 0, rates_total, signalBuf) < rates_total ||
      CopyBuffer(handle, BUF_HIST, 0, rates_total, histBuf) < rates_total)
     {
      Print("ExportMacdOracle: CopyBuffer failed, err=", GetLastError());
      IndicatorRelease(handle);
      return;
     }

   IndicatorRelease(handle);

   if(!EnsureDir(InpSubdir))
     {
      Print("ExportMacdOracle: cannot create output directory");
      return;
     }

   const int mainFirst = InpSlowPeriod - 1;
   const int signalFirst = mainFirst + InpSignalPeriod - 1;
   const string tag = Tag();
   string tagLower = tag;
   StringToLower(tagLower);
   const string path = InpSubdir + "\\" + tag + ".json";

   int h = FileOpen(path, FILE_WRITE | FILE_TXT | FILE_ANSI);
   if(h == INVALID_HANDLE)
     {
      Print("ExportMacdOracle: cannot open ", path, " err=", GetLastError());
      return;
     }

   // CopyRates fills oldest-first; write chronological JSON for the JS port.
   FileWriteString(h, "{\n");
   FileWriteString(h, "  \"name\": \"" + JsonEscape(tagLower) + "\",\n");
   FileWriteString(h, "  \"symbol\": \"" + JsonEscape(_Symbol) + "\",\n");
   FileWriteString(h, "  \"timeframe\": \"" + JsonEscape(EnumToString((ENUM_TIMEFRAMES)Period())) + "\",\n");
   FileWriteString(h, "  \"params\": {\"fast\": " + IntegerToString(InpFastPeriod) +
                   ", \"slow\": " + IntegerToString(InpSlowPeriod) +
                   ", \"signal\": " + IntegerToString(InpSignalPeriod) +
                   ", \"applied_price\": \"typical\"},\n");
   FileWriteString(h, "  \"bar_window\": {\"count\": " + IntegerToString(rates_total) +
                   ", \"oldest_time\": " + IntegerToString((long)rates[0].time) +
                   ", \"newest_time\": " + IntegerToString((long)rates[rates_total - 1].time) + "},\n");
   FileWriteString(h, "  \"main_first\": " + IntegerToString(mainFirst) + ",\n");
   FileWriteString(h, "  \"signal_first\": " + IntegerToString(signalFirst) + ",\n");
   FileWriteString(h, "  \"hist_first\": " + IntegerToString(signalFirst) + ",\n");

   FileWriteString(h, "  \"bars\": [\n");
   for(int i = 0; i < rates_total; i++)
     {
      FileWriteString(h, "    {\"time\": " + IntegerToString((long)rates[i].time) +
                      ", \"open\": " + DoubleToString(rates[i].open, 10) +
                      ", \"high\": " + DoubleToString(rates[i].high, 10) +
                      ", \"low\": " + DoubleToString(rates[i].low, 10) +
                      ", \"close\": " + DoubleToString(rates[i].close, 10) + "}");
      FileWriteString(h, (i + 1 < rates_total) ? ",\n" : "\n");
     }
   FileWriteString(h, "  ],\n");

   FileWriteString(h, "  \"main\": [\n");
   for(int i = 0; i < rates_total; i++)
     {
      FileWriteString(h, "    " + DoubleToString(mainBuf[i], 10));
      FileWriteString(h, (i + 1 < rates_total) ? ",\n" : "\n");
     }
   FileWriteString(h, "  ],\n");

   FileWriteString(h, "  \"signal\": [\n");
   for(int i = 0; i < rates_total; i++)
     {
      FileWriteString(h, "    " + DoubleToString(signalBuf[i], 10));
      FileWriteString(h, (i + 1 < rates_total) ? ",\n" : "\n");
     }
   FileWriteString(h, "  ],\n");

   FileWriteString(h, "  \"histogram\": [\n");
   for(int i = 0; i < rates_total; i++)
     {
      FileWriteString(h, "    " + DoubleToString(histBuf[i], 10));
      FileWriteString(h, (i + 1 < rates_total) ? ",\n" : "\n");
     }
   FileWriteString(h, "  ]\n");
   FileWriteString(h, "}\n");

   FileClose(h);
   Print("ExportMacdOracle: wrote ", rates_total, " bars to ", path);
   Alert("ExportMacdOracle: done for ", tag, "\nFiles in MQL5/Files/", InpSubdir, "/");
  }
//+------------------------------------------------------------------+
