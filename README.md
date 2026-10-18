# Stockify

台股持股與股息紀錄。股價用臺灣證券交易所公開行情更新，損益、股息、配息、配股都留在這台裝置。

## 畫面上有什麼

- 累積損益、今日損益、市值、股息收入
- 每一檔的股價、成本均價、買進均價、扣掉預估賣出費用後的損益
- 按日期看交易與每日損益
- 手動新增買進、賣出、股息／配息、配股

交易日 9:00–13:30 約每 20 秒更新，其餘時間約每 3 分鐘，回到 App 也會再抓一次。

## 在電腦先看

需要 Node.js 22 以上。

```bash
npm install
npm run web
```

瀏覽器打開 http://localhost:8081 。這個指令會一併啟動報價轉接，因為瀏覽器不能直接呼叫證交所。

## 安裝到 Android 與 iOS

開發階段最快的方式是 Expo Go：

1. 手機安裝 [Expo Go](https://expo.dev/go)（Android、iOS 都有）
2. 電腦執行 `npm start`
3. Android 用 Expo Go 掃終端機的 QR code。iPhone 用相機掃 QR code，再交給 Expo Go

手機與電腦要在同一個網路。正式安裝檔可以用 [EAS Build](https://docs.expo.dev/build/setup/)：

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
eas build -p ios --profile preview
```

Android 的 preview 設定會做出可直接安裝的 APK。iOS 安裝檔需要 Apple Developer 帳號，沒有帳號時先用 Expo Go。

## 損益算法

未實現損益 = 市值 − 持股成本 − 預估賣出手續費與證券交易稅。ETF 交易稅以 0.1% 估算，一般股票 0.3%。手續費預設是法定 0.1425%，可在說明頁改折扣與最低手續費。

買進均價只看成交價。現金股息預設會從成本扣除，所以成本均價會下降，買進均價不變。配股增加股數、總成本不變。這些都可以在說明頁調整。
