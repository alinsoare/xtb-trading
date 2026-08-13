//+------------------------------------------------------------------+
//|                                              ExportOBOracle.mq5  |
//|  Dumps OHLC bars, SMCTrading pivot buffers, and SMC_RECT_* zones |
//|  for OB parity fixtures. Dev-time oracle tooling only.           |
//+------------------------------------------------------------------+
//| EXPORT PROCEDURE (run by hand in MT5-Testing):                   |
//|  1. Open a D1 (or other H4+) chart for the instrument.          |
//|  2. Attach SMCTrading with InpShowHistory = true.                 |
//|  3. Force a full recalculation (remove/re-add indicator, or       |
//|     switch timeframe away and back).                             |
//|  4. Run this script on the chart.                                |
//|  5. CSVs land in MQL5/Files/ob_oracle/                           |
//|  6. Run: uv run python tools/generate_ob_fixtures.py              |
//+------------------------------------------------------------------+
#property copyright "Alin Soare"
#property version   "1.00"
#property script_show_inputs

input string InpSubdir = "ob_oracle";  // Output subdirectory under MQL5/Files

// SMCTrading buffer indices (see SMCTrading.mq5 header)
#define BUF_PIVOT_HIGH    0
#define BUF_PIVOT_LOW     1
#define BUF_CONFIRM       4
#define BUF_MOVE_TYPE     12
#define BUF_CONFIRM_PRICE 13

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
int FindSMCTradingHandle(const long chart_id)
  {
   const int total = ChartIndicatorsTotal(chart_id, 0);
   for(int i = 0; i < total; i++)
     {
      string name = ChartIndicatorName(chart_id, 0, i);
      if(StringFind(name, "SMCTrading") >= 0)
         return (int)ChartIndicatorGet(chart_id, 0, name);
     }
   return INVALID_HANDLE;
  }

//+------------------------------------------------------------------+
void ExportBars(const string path)
  {
   MqlRates rates[];
   const int copied = CopyRates(_Symbol, PERIOD_CURRENT, 0, Bars(_Symbol, PERIOD_CURRENT), rates);
   if(copied <= 0)
     {
      Print("ExportOBOracle: CopyRates failed, err=", GetLastError());
      return;
     }

   int h = FileOpen(path, FILE_WRITE | FILE_CSV | FILE_ANSI, ',');
   if(h == INVALID_HANDLE)
     {
      Print("ExportOBOracle: cannot open ", path, " err=", GetLastError());
      return;
     }

   FileWrite(h, "time", "open", "high", "low", "close");
   // CopyRates fills oldest-first, so walk it forwards: the JS port consumes an
   // oldest-first array and the generator derives the newest bar from the last row.
   for(int i = 0; i < copied; i++)
     {
      FileWrite(h,
                IntegerToString((long)rates[i].time),
                DoubleToString(rates[i].open, 10),
                DoubleToString(rates[i].high, 10),
                DoubleToString(rates[i].low, 10),
                DoubleToString(rates[i].close, 10));
     }
   FileClose(h);
   Print("ExportOBOracle: wrote ", copied, " bars to ", path);
  }

//+------------------------------------------------------------------+
void ExportPivots(const string path, const int handle, const int rates_total)
  {
   double pivotHigh[], pivotLow[], confirm[], moveType[], confirmPrice[];
   datetime times[];
   if(CopyTime(_Symbol, PERIOD_CURRENT, 0, rates_total, times) < rates_total)
     {
      Print("ExportOBOracle: CopyTime failed");
      return;
     }
   ArraySetAsSeries(times, true);

   if(CopyBuffer(handle, BUF_PIVOT_HIGH, 0, rates_total, pivotHigh) < rates_total ||
      CopyBuffer(handle, BUF_PIVOT_LOW, 0, rates_total, pivotLow) < rates_total ||
      CopyBuffer(handle, BUF_CONFIRM, 0, rates_total, confirm) < rates_total ||
      CopyBuffer(handle, BUF_MOVE_TYPE, 0, rates_total, moveType) < rates_total ||
      CopyBuffer(handle, BUF_CONFIRM_PRICE, 0, rates_total, confirmPrice) < rates_total)
     {
      Print("ExportOBOracle: CopyBuffer failed, err=", GetLastError());
      return;
     }

   // CopyBuffer returns oldest-first; SMCTrading writes its buffers as series and
   // stores confirmationBar as a series index. Align every array to series indexing
   // so one loop variable means the same bar in all of them.
   ArraySetAsSeries(pivotHigh, true);
   ArraySetAsSeries(pivotLow, true);
   ArraySetAsSeries(confirm, true);
   ArraySetAsSeries(moveType, true);
   ArraySetAsSeries(confirmPrice, true);

   int h = FileOpen(path, FILE_WRITE | FILE_CSV | FILE_ANSI, ',');
   if(h == INVALID_HANDLE)
     {
      Print("ExportOBOracle: cannot open ", path);
      return;
     }

   FileWrite(h, "time", "type", "extreme", "confirm_bar_index",
             "confirmation_time", "confirm_price", "move_type");

   // Series index 0 = newest; walk oldest-first for fixture generator.
   for(int s = rates_total - 1; s >= 0; s--)
     {
      bool isHigh = (pivotHigh[s] != EMPTY_VALUE && pivotHigh[s] != 0.0);
      bool isLow  = (pivotLow[s] != EMPTY_VALUE && pivotLow[s] != 0.0);
      if(!isHigh && !isLow)
         continue;
      if(isHigh && isLow)
        {
         // Should not happen; prefer high if both set.
         isLow = false;
        }

      string ptype = isHigh ? "high" : "low";
      double extreme = isHigh ? pivotHigh[s] : pivotLow[s];
      int confirmBarIdx = (int)confirm[s];
      datetime confirmTime = (confirmBarIdx >= 0 && confirmBarIdx < rates_total)
                             ? times[confirmBarIdx] : 0;
      double mv = moveType[s];
      string mvLabel = "unknown";
      if(mv > 0.5) mvLabel = "impulse";
      else if(mv < -0.5) mvLabel = "pullback";

      FileWrite(h,
                IntegerToString((long)times[s]),
                ptype,
                DoubleToString(extreme, 10),
                IntegerToString(confirmBarIdx),
                IntegerToString((long)confirmTime),
                DoubleToString(confirmPrice[s], 10),
                mvLabel);
     }
   FileClose(h);
   Print("ExportOBOracle: wrote pivots to ", path);
  }

//+------------------------------------------------------------------+
void ExportZones(const string path, const datetime newestBarTime)
  {
   int h = FileOpen(path, FILE_WRITE | FILE_CSV | FILE_ANSI, ',');
   if(h == INVALID_HANDLE)
     {
      Print("ExportOBOracle: cannot open ", path);
      return;
     }

   FileWrite(h, "object_name", "time_from", "time_to", "price_high", "price_low");

   const int total = ObjectsTotal(0, 0, OBJ_RECTANGLE);
   int count = 0;
   for(int i = 0; i < total; i++)
     {
      string name = ObjectName(0, i, 0, OBJ_RECTANGLE);
      if(StringFind(name, "SMC_RECT_") != 0)
         continue;

      datetime t0 = (datetime)ObjectGetInteger(0, name, OBJPROP_TIME, 0);
      datetime t1 = (datetime)ObjectGetInteger(0, name, OBJPROP_TIME, 1);
      double p0 = ObjectGetDouble(0, name, OBJPROP_PRICE, 0);
      double p1 = ObjectGetDouble(0, name, OBJPROP_PRICE, 1);
      double priceHigh = MathMax(p0, p1);
      double priceLow  = MathMin(p0, p1);
      datetime timeFrom = MathMin(t0, t1);
      datetime timeTo   = MathMax(t0, t1);

      FileWrite(h,
                name,
                IntegerToString((long)timeFrom),
                IntegerToString((long)timeTo),
                DoubleToString(priceHigh, 10),
                DoubleToString(priceLow, 10));
      count++;
     }
   FileClose(h);
   Print("ExportOBOracle: wrote ", count, " zones to ", path,
         " (newest bar time=", (long)newestBarTime, ")");
  }

//+------------------------------------------------------------------+
//| Point size decides what the 50-point confirmation distance means, |
//| so the fixture records it from the terminal rather than trusting  |
//| a flag passed to the generator by hand.                           |
//+------------------------------------------------------------------+
void ExportMeta(const string path, const int rates_total, const datetime newestBarTime)
  {
   int h = FileOpen(path, FILE_WRITE | FILE_CSV | FILE_ANSI, ',');
   if(h == INVALID_HANDLE)
     {
      Print("ExportOBOracle: cannot open ", path);
      return;
     }

   FileWrite(h, "key", "value");
   FileWrite(h, "symbol", _Symbol);
   FileWrite(h, "timeframe", EnumToString((ENUM_TIMEFRAMES)Period()));
   FileWrite(h, "point_size", DoubleToString(_Point, 10));
   FileWrite(h, "digits", IntegerToString(_Digits));
   FileWrite(h, "bars", IntegerToString(rates_total));
   FileWrite(h, "newest_bar_time", IntegerToString((long)newestBarTime));
   FileWrite(h, "server_time", IntegerToString((long)TimeCurrent()));
   FileClose(h);
   Print("ExportOBOracle: wrote meta to ", path,
         " (point=", DoubleToString(_Point, 10), ", digits=", _Digits, ")");
  }

//+------------------------------------------------------------------+
void OnStart()
  {
   const long chart_id = ChartID();
   const int handle = FindSMCTradingHandle(chart_id);
   if(handle == INVALID_HANDLE)
     {
      Alert("ExportOBOracle: attach SMCTrading to this chart first (InpShowHistory=true), "
            "force a recalculation, then re-run.");
      return;
     }

   const int rates_total = Bars(_Symbol, PERIOD_CURRENT);
   if(rates_total < 10)
     {
      Print("ExportOBOracle: too few bars");
      return;
     }

   datetime newestTime[];
   if(CopyTime(_Symbol, PERIOD_CURRENT, 0, 1, newestTime) < 1)
     {
      Print("ExportOBOracle: CopyTime newest failed");
      return;
     }

   if(!EnsureDir(InpSubdir))
     {
      Print("ExportOBOracle: cannot create output directory");
      return;
     }

   const string tag = Tag();
   string barsPath   = InpSubdir + "\\bars_" + tag + ".csv";
   string pivotsPath = InpSubdir + "\\pivots_" + tag + ".csv";
   string zonesPath  = InpSubdir + "\\zones_" + tag + ".csv";
   string metaPath   = InpSubdir + "\\meta_" + tag + ".csv";

   ExportBars(barsPath);
   ExportPivots(pivotsPath, handle, rates_total);
   ExportZones(zonesPath, newestTime[0]);
   ExportMeta(metaPath, rates_total, newestTime[0]);

   Alert("ExportOBOracle: done for ", tag,
         "\nFiles in MQL5/Files/", InpSubdir, "/");
  }
