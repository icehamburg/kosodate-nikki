# kosodate-nikki 引き継ぎドキュメント

## プロジェクト概要

毎日の育児記録をつけて、1年分をPDFで出力 → ユーザーが自分で印刷・製本できるWebアプリ。

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router) + TypeScript
- **スタイリング**: Tailwind CSS
- **バックエンド**: Supabase (認証 / DB / ストレージ)
- **ホスティング**: Vercel（予定）

## Supabase接続情報

- **URL**: `https://ffoytpupnzpuhaoopobc.supabase.co`
- **Anon Key**: `sb_publishable_kRfh0DGzBLsHN4MbVls8og_86dpMpt4`
- **リージョン**: Northeast Asia (Tokyo)

## DBテーブル構成

```sql
-- 子どもテーブル
children (
  id UUID PK,
  user_id UUID → auth.users,
  name TEXT,
  birthday DATE,
  photo_url TEXT,
  created_at TIMESTAMPTZ
)

-- 記録テーブル
records (
  id UUID PK,
  child_id UUID → children,
  type TEXT,          -- ミルク、うんち、睡眠など
  recorded_at TIMESTAMPTZ,
  value JSONB,        -- 型ごとの詳細データ
  memo TEXT,
  created_at TIMESTAMPTZ
)

-- 日記テーブル
diaries (
  id UUID PK,
  child_id UUID → children,
  date DATE,
  content TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMPTZ,
  UNIQUE(child_id, date)
)
```

- RLS有効化済み（自分のデータのみアクセス可）
- Confirm email: OFF（開発用）

## プロジェクトのファイル構成

```
kosodate-nikki/
├── .env.local                  # Supabase接続情報
├── src/
│   ├── app/
│   │   ├── auth/page.tsx       # ログイン・新規登録
│   │   ├── children/new/page.tsx # 子ども登録
│   │   ├── page.tsx            # ホーム（記録入力）
│   │   ├── calendar/page.tsx   # カレンダー
│   │   ├── summary/page.tsx    # まとめ（統計）
│   │   ├── export/page.tsx     # PDF出力
│   │   ├── settings/page.tsx   # 設定
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── BottomNav.tsx       # 下部ナビゲーション
│   │   ├── HomeClient.tsx      # ホーム画面のクライアント部分
│   │   ├── RecordModal.tsx     # 記録入力モーダル
│   │   └── DiaryModal.tsx      # 日記入力モーダル
│   └── lib/
│       ├── supabase/
│       │   ├── client.ts       # ブラウザ用Supabaseクライアント
│       │   └── server.ts       # サーバー用Supabaseクライアント
│       └── types.ts            # 型定義（Child, Record, Diary, RECORD_TYPES）
```

## 実装済み機能

- ✅ 認証（メール + パスワード、Supabase Auth）
- ✅ 子ども登録・複数人対応・切り替え
- ✅ ホーム画面（アイコンタップで記録入力）
- ✅ 記録入力モーダル（ミルク、うんち、おしっこ、睡眠、体温、身長、体重、お風呂、散歩、離乳食、おやつ、薬、病院、その他）
- ✅ 日記入力モーダル
- ✅ タイムライン表示
- ✅ カレンダー画面
- ✅ まとめ画面（統計）
- ✅ PDF出力画面（UIのみ、生成処理は未実装）
- ✅ 設定画面（ログアウト、子ども追加）
- ✅ ボトムナビゲーション

## 未実装（次にやること）

### 1. 写真アップロード
- 日記に写真を添付する機能
- Supabase Storageを使う想定

### 2. PDF生成（メインの残タスク）
- 4テーマ対応: シンプル / ナチュラル / パステルピンク / パステルブルー
- **レイアウト**: A4縦、週まとめ形式（1年分 ≒ 52ページ）
  - 写真7枚（1日1枚ベスト）が並ぶ
  - 週ごとの振り返りコメント
  - サマリーアイコン（ミルク回数、うんち回数、睡眠時間の平均など）
- React-PDF or Puppeteer で生成
- ユーザーがダウンロードして自分で印刷所に入稿する運用

## 設計上の決定事項

- **夫婦共有**: 同一アカウント共有で対応（専用の共有機能は作らない）
- **製本連携**: なし。PDFをユーザーが自分でグラフィック等に入稿
- **モノトーンテーマ**: 黒背景は印刷コスト的にNG → 不採用
- **グラフ・通知**: 後回し
- **収益モデル**: 未定（PDF出力を有料機能 or 月額サブスクが候補）

## ローカル開発

```bash
cd ~/Downloads/kosodate-nikki
npm install
npm run dev
# → http://localhost:3000
```

## 参考にしたサービス

- **ぴよログ**: 育児記録の王道。記録項目やタイムバー表示を参考に
- **BABY365**: 1日1枚写真＋短文のシンプルさ。マガジン風PDFの方向性を参考に
