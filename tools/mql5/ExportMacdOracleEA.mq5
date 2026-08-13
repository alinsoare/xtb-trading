//+------------------------------------------------------------------+
//|                                       ExportMacdOracleEA.mq5     |
//|  Strategy-tester one-shot export for MACD parity fixtures.       |
//+------------------------------------------------------------------+
#property copyright "Alin Soare"
#property version   "1.00"

input string InpSubdir = "macd_oracle";
input int    InpFastPeriod   = 13;
input int    InpSlowPeriod   = 34;
input int    InpSignalPeriod = 9;

#define BUF_MAIN    0
#define BUF_SIGNAL  1
#define BUF_HIST    2

//+------------------------------------------------------------------+
string JsonEscape(const string s)
  {
   string out = s;
   StringReplace(out, "\\", "\\\\");
   StringReplace(out, "\"", "\\\"");
   return out;
  }

//+------------------------------------------------------------------+
int OnInit()
  {
   const int rates_total = Bars(_Symbol, PERIOD_CURRENT);
   if(rates_total < InpSlowPeriod + InpSignalPeriod)
     {
      Print("ExportMacdOracleEA: too few bars");
      return INIT_FAILED;
     }

   const int handle = iCustom(_Symbol, PERIOD_CURRENT, "SimpleMACD",
                              InpFastPeriod, InpSlowPeriod, InpSignalPeriod,
                              true, PRICE_TYPICAL);
   if(handle == INVALID_HANDLE)
     {
      Print("ExportMacdOracleEA: iCustom failed, err=", GetLastError());
      return INIT_FAILED;
     }

   for(int attempt = 0; attempt < 50; attempt++)
     {
      if(BarsCalculated(handle) >= rates_total)
         break;
      Sleep(100);
     }

   MqlRates rates[];
   if(CopyRates(_Symbol, PERIOD_CURRENT, 0, rates_total, rates) < rates_total)
     {
      Print("ExportMacdOracleEA: CopyRates failed");
      IndicatorRelease(handle);
      return INIT_FAILED;
     }

   double mainBuf[], signalBuf[], histBuf[];
   if(CopyBuffer(handle, BUF_MAIN, 0, rates_total, mainBuf) < rates_total ||
      CopyBuffer(handle, BUF_SIGNAL, 0, rates_total, signalBuf) < rates_total ||
      CopyBuffer(handle, BUF_HIST, 0, rates_total, histBuf) < rates_total)
     {
      Print("ExportMacdOracleEA: CopyBuffer failed, err=", GetLastError());
      IndicatorRelease(handle);
      return INIT_FAILED;
     }

   IndicatorRelease(handle);

   FolderCreate(InpSubdir, 0);
   const string tag = _Symbol + "_" + EnumToString((ENUM_TIMEFRAMES)Period());
   string tagLower = tag;
   StringToLower(tagLower);
   const string path = InpSubdir + "\\" + tag + ".json";

   int h = FileOpen(path, FILE_WRITE | FILE_TXT | FILE_ANSI);
   if(h == INVALID_HANDLE)
     {
      Print("ExportMacdOracleEA: cannot open ", path);
      return INIT_FAILED;
     }

   const int mainFirst = InpSlowPeriod - 1;
   const int signalFirst = mainFirst + InpSignalPeriod - 1;

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

   Print("ExportMacdOracleEA: wrote ", rates_total, " bars to ", path);
   ExpertRemove();
   return INIT_SUCCEEDED;
  }
//+------------------------------------------------------------------+
