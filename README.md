# toyosu-blind

視覚障害者向けのジオフェンス警告アプリです。スマートフォンのGPS位置情報とコンパス方位を使用して、指定されたエリア(ポリゴン)の境界に近づいたり超えたりした場合に、画面表示とビープ音で警告します。

## 特徴

- **シンプルな状態表示**: 安全・注意・警告・危険の4段階を大きな文字と色で表示
- **ビープ音による多段階警告**: 距離に応じて異なる周波数・間隔の警告音
- **方向指示**: コンパスを使用して最も近い境界への方向を矢印で表示
- **GPS精度表示**: 位置情報の精度が低い場合は画面に表示
- **プレーンHTML/JS**: ビルド不要で軽量、低スペック端末でも動作
- **カスタマイズ可能**: 設定ファイルとgeojsonファイルを差し替えるだけで別のエリアに対応

## セットアップ

### 必要な環境
- HTTPS対応のWebサーバー(本番環境)、またはローカルホスト
- 位置情報とコンパス機能に対応したスマートフォン

### 開発環境での起動

```bash
# 簡易HTTPサーバで起動
npx serve

# またはNode.jsを使用
node -e "const http = require('http'); const fs = require('fs'); http.createServer((req, res) => { res.writeHead(200); res.end(fs.readFileSync('.' + (req.url === '/' ? '/index.html' : req.url))); }).listen(8000);"
```

ローカルホストはブラウザの仕様上、HTTPS不要でGeolocation/DeviceOrientation APIが使用できます。

## 使用方法

1. アプリを起動して「開始」ボタンをタップ
2. 位置情報とコンパスへのアクセスを許可
3. 現在地とジオフェンス境界との関係が以下のように表示されます：

| 状態 | 条件 | 表示 | 音 |
|---|---|---|---|
| **安全** | 内側、境界まで20m以上 | 緑 | 無音 |
| **注意** | 内側、境界まで20m以下 | 黄 | 低速ビープ(2秒間隔) |
| **警告** | 内側20m以内または外側で3m以内 | オレンジ | 中速ビープ(0.7秒間隔) |
| **危険** | 外側で3m以上離脱 | 赤(全画面) | 連続アラート音 |

### テスト・デバッグモード

起動後の画面で緯度経度と方位を手動入力できます。実際にエリアに行かなくても動作確認が可能です。

## ジオフェンスのカスタマイズ

このアプリは`toyosu.geojson`ファイルで定義されたポリゴンをジオフェンスとして使用します。豊洲以外のエリアで使用する場合は以下の手順で対応できます。

### 1. GeoJSONファイルの作成

**https://geojson.io/** を使用してGeoJSONファイルを作成します。

操作手順：
1. https://geojson.io/ にアクセス
2. 左側のDrawツール(ペンマーク)を選択
3. 地図上でポリゴンを描画(対象エリアの外枠をなぞる)
4. 右側の「Feature Collection」が自動生成されます
5. 左下の「Save」ボタンから`toyosu.geojson`(任意の名前).geojson形式で保存

### 2. GeoJSONファイルの配置

作成したGeoJSONファイルをプロジェクトルートに配置します：

```
toyosu-blind/
├── index.html
├── toyosu.geojson       ← 作成したファイルをここに配置
├── config.js
└── ...
```

### 3. 設定ファイルの更新(必要に応じて)

`config.js`の`GEOJSON_PATH`で別のファイル名を指定している場合は更新します：

```javascript
// config.js
const GEOJSON_PATH = './your-geojson-file.geojson';
```

## ファイル構成

```
toyosu-blind/
├── index.html           # UIと状態表示画面
├── style.css            # スタイルシート
├── app.js               # 状態管理、位置情報・方位センサー制御、UI更新
├── geo-utils.js         # 内外判定・距離計算・方位計算のユーティリティ
├── audio.js             # Web Audio APIによるビープ音生成
├── config.js            # 閾値定数、設定値
├── toyosu.geojson       # ジオフェンス用ポリゴン(差し替え可能)
└── README.md            # このファイル
```

## 設定のカスタマイズ

`config.js`で以下の値を調整できます：

```javascript
const CAUTION_M = 20;           // 内側で「注意」状態に変わる距離(m)
const WARNING_M = 8;            // 内側で「警告」状態に変わる距離(m)
const DANGER_OUTSIDE_M = 3;     // 外側で「危険」状態に変わる距離(m)
const ACCURACY_WARN_M = 20;     // GPS精度低下を通知する閾値(m)

const BEEP_FREQUENCIES = {
  caution: 800,                 // 注意時のビープ音周波数(Hz)
  warning: 1200,
  danger: 1600,
};
```

## 技術仕様

- **ジオメトリ計算**: Ray castingアルゴリズムで内外判定、最短距離算出
- **座標系**: 緯度経度を簡易等距離円筒図法でメートル単位に変換
- **位置情報**: Geolocation API(`watchPosition`)で継続取得
- **方位**: DeviceOrientationEvent APIでコンパス方位を取得
- **音声**: Web Audio APIでビープ音を生成

## ブラウザ互換性

- **必須**: Geolocation API、DeviceOrientation API対応
- **推奨**: iOS 13以上、Android 6以上のモダンブラウザ
- **注意**: iOS Safariではユーザージェスチャー(「開始」ボタンタップ)後にアクセス許可がリクエストされます

## デプロイ

### ローカルテスト
```bash
npx serve
```

### 本番環境
GitHub Pages、Netlify、VercelなどのHTTPS対応ホスティングサービスにデプロイしてください。

## ライセンス

MITライセンス

## 注意事項

- GPS精度は環境(屋内外、建物周辺など)に大きく影響されます
- 本アプリは補助的な安全確認ツールです。必ず周囲の状況にも注意してください
- 位置情報とコンパス機能を使用するため、バッテリー消費量が多くなります
