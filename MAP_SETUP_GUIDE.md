# 地図表示システムガイド / Map Display System Guide

## 概要 / Overview
キャラクター選択画面で、選択された色の領土を示す地図を表示する機能です。
**新システム**: SVGベースの地図で、画像不要！各エリアが自動的にハイライト表示されます。

---

## 🎨 SVGベースの地図システム（推奨）

### 特徴
✅ **画像不要** - HTMLとCSSだけで地図を表示
✅ **自動ハイライト** - 選択した色のエリアが自動的に色付け
✅ **クリック可能** - 地図上のエリアをクリックして色を切り替え
✅ **レスポンシブ** - どんな画面サイズでも綺麗に表示
✅ **編集が簡単** - SVGファイルを編集するだけ

### システム構成

```
プロジェクトルート/
  map.svg           ← SVG地図ファイル（全エリアを含む）
  index.html        ← 地図を表示するコンテナ
  app.js            ← 地図の読み込みとインタラクション
  styles.css        ← 地図のスタイル
  data/
    colors.json     ← 色の定義と詳細情報（統合済み）
    エルブ/
      characters/   ← キャラクター情報
```

### 地図の仕組み

1. **SVGファイル（map.svg）**
   - 全てのエリアがSVGパスとして定義されています
   - 各エリアには `data-color` 属性で色名が設定されています
   - エリア名とサブエリア名がテキストとして表示されています

2. **自動ハイライト**
   - 色を選択すると、その色のエリアが自動的にハイライト
   - ハイライトは各色の `colorCode` を使用
   - 他のエリアは半透明になります

3. **インタラクティブ**
   - 地図上のエリアをクリックすると、その色に切り替わります
   - ホバー時にエリアが明るくなります

---

## 📝 地図の編集方法

### 新しいエリアを追加する

`map.svg` ファイルを編集して、新しいエリアを追加できます：

```xml
<!-- 新しいエリアの例 -->
<path id="region-新色名" class="region" data-color="新色名"
      d="M 100,100 L 200,100 L 200,200 L 100,200 Z"/>
<text class="region-label" x="150" y="150">新色名</text>
<text class="area-label" x="150" y="175">サブエリア名</text>
```

### エリアの形状を変更する

SVG編集ツールを使用することをお勧めします：
- **Inkscape** (無料) - https://inkscape.org/
- **Adobe Illustrator** (有料)
- **Figma** (無料/有料) - https://www.figma.com/

### 座標の指定方法

SVGの `path` 要素の `d` 属性で形状を定義します：
- `M x,y` - 移動（Move to）
- `L x,y` - 直線（Line to）
- `Z` - パスを閉じる（Close path）

例：
```xml
d="M 100,100 L 200,100 L 200,200 L 100,200 Z"
```
これは正方形を描きます：(100,100) → (200,100) → (200,200) → (100,200) → 閉じる

---

## 🎯 色の設定

### colors.json
各色の基本情報を定義します：

```json
{
  "colors": [
    {
      "id": "Herbe",
      "name": "エルブ",
      "colorCode": "#79C288",
      "dataPath": "data/エルブ"
    }
  ]
}
```

### colors.json（統合版）
各色の詳細情報は `data/colors.json` に統合されています：

```json
{
  "colors": [
    {
      "id": "Herbe",
      "name": "エルブ",
      "colorCode": "#79C288",
      "dataPath": "data/エルブ",
      "area": "森林",
      "description": "怪我や病を癒すための魔法に長けたまほうつかいたち...",
      "symbol": "symbol.png"
    }
  ]
}
```

**注意**: 個別の `color.json` ファイルは廃止され、すべての情報が `data/colors.json` に統合されました。

旧形式（廃止）：
```json
{
  "name": "エルブ",
  "colorCode": "#79C288",
  "description": "怪我や病を癒すための魔法に長けたまほうつかいたち...",
  "symbol": "symbol.png"
}
```

**注意**: `mapHighlight` プロパティは不要になりました（SVGシステムでは使用しません）

---

## 🎨 スタイルのカスタマイズ

### エリアの色
デフォルトの色を変更するには、`map.svg` 内のスタイルを編集：

```css
.region {
  fill: #e0e0e0;        /* デフォルトの塗りつぶし色 */
  stroke: #ffffff;      /* 境界線の色 */
  stroke-width: 4;      /* 境界線の太さ */
}
```

### テキストのスタイル
エリア名とサブエリア名のスタイルを変更：

```css
.region-label {
  fill: #333333;        /* テキストの色 */
  font-size: 28px;      /* フォントサイズ */
}

.area-label {
  fill: #666666;        /* サブエリアのテキスト色 */
  font-size: 20px;      /* サブエリアのフォントサイズ */
}
```

### ホバー効果
`styles.css` でホバー時の動作を変更：

```css
.map-container .region:hover {
  opacity: 0.8;
  filter: brightness(1.1);
}
```

---

## 📱 レスポンシブ対応

地図は自動的に画面サイズに合わせて調整されます：

### デスクトップ
- 最大幅: 600px
- `.color-background` の幅: 50%

### モバイル
- 幅: 100%
- 最小高さ: 50vh

---

## 🔧 トラブルシューティング

### 地図が表示されない
1. `map.svg` ファイルがプロジェクトルートにあることを確認
2. ブラウザのコンソールでエラーを確認
3. SVGファイルの構文が正しいか確認

### エリアがハイライトされない
1. `data-color` 属性が `colors.json` の `name` と一致しているか確認
2. `colorCode` が正しい16進数カラーコードか確認

### クリックが反応しない
1. SVGの `pointer-events` が無効になっていないか確認
2. 他の要素が地図の上に重なっていないか確認

---

## 💡 Tips

### 複雑な形状を作成する
1. Inkscapeなどのツールで形状を描く
2. SVGとして保存
3. `path` 要素の `d` 属性をコピー
4. `map.svg` に貼り付け

### エリアの境界を調整する
- 隣接するエリアの境界線を共有すると、隙間なく配置できます
- わずかに重ねることで、境界線が二重に見えるのを防げます

### パフォーマンスの最適化
- エリアの数が多い場合、パスの頂点数を減らすことを検討
- 不要な詳細は省略し、シンプルな形状を維持

---

## 📊 現在の地図に含まれるエリア

1. **緋色** - 上部中央
2. **月白** - 右上（雪国）
3. **燈苑** - 右側上部（森林）
4. **スマルト** - 右側下部
5. **トープ** - 右下
6. **カナール** - 下部中央（港町）
7. **ラセット** - 左下
8. **梅幸茶** - 左側下部
9. **カメリア** - 左側上部
10. **学術都市** - 左中央
11. **商業都市** - 中央下部
12. **工業都市** - 中央右下部
13. **中央部** - 中央
14. **ピアニー** - 中央上部
15. **山岳** - 中央上部右
16. **エルブ** - 左上（農村）
17. **ミモザ** - 左上

---

## 🔄 従来の画像ベースシステムからの移行

従来の `mapHighlight` システムから移行する場合：

1. `map.svg` を配置
2. 個別の `color.json` ファイルは不要（`data/colors.json` に統合済み）
3. 個別の地図画像は不要になります

システムは自動的にSVG地図を優先して使用します。

---

## 実装の詳細 / Implementation Details

### HTML構造
```html
<div class="map-container" id="mapContainer">
    <!-- SVG Map will be loaded here -->
</div>
```

### JavaScript
```javascript
async function loadTerritoryMap(colorId) {
    // SVGファイルを読み込み
    const response = await fetch('map.svg');
    const svgText = await response.text();
    mapContainer.innerHTML = svgText;
    
    // 選択された色のエリアをハイライト
    const selectedRegion = svg.querySelector(`[data-color="${color.name}"]`);
    selectedRegion.style.fill = color.colorCode;
}
```

### CSS
```css
.map-container svg {
    width: 100%;
    height: auto;
}

.region {
    transition: all 0.3s ease;
    cursor: pointer;
}
```

---

## 📚 参考リンク

- [SVG Tutorial - MDN](https://developer.mozilla.org/ja/docs/Web/SVG/Tutorial)
- [Inkscape - 無料SVG編集ツール](https://inkscape.org/)
- [SVG Path Editor - オンラインツール](https://yqnn.github.io/svg-path-editor/)