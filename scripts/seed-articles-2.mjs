/**
 * 特集記事の第2弾 (5本)。2026-08 に拡充した温泉・工場見学・商業施設・
 * 展望・秋ジャンルの新スポットを束ねる。
 *
 * 方針は seed-articles.mjs と同じ: 事実は :::spot カードが担い、
 * 地の文には営業時間・料金・イベント日程を書かない。
 *
 * Dry run: node scripts/seed-articles-2.mjs
 * Apply:   node scripts/seed-articles-2.mjs --apply
 */

import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"

const env = {}
for (const line of readFileSync("./.env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "")
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const apply = process.argv.includes("--apply")

const S = {
  spaWorld: "8adb9368-5973-4751-9eed-4949ca511247",
  taiko: "ac148d89-e507-431a-a694-0818f59ff2a4",
  manyo: "df15775e-6e8f-4281-8dc7-7ed3e07a814a",
  suminoeSpa: "ac5b2782-0067-4029-9647-d19f9e7d4726",
  fufu: "b97cccd0-c85b-4c65-9152-f9c7882b6915",
  ren: "a0ce3e07-4a23-4402-9753-212066f409ca",
  soraniwa: "6a43f0dd-e019-44aa-bee4-cf9512cb9715",
  sakinoyu: "f4ba06de-7d9a-466b-a08b-3a93c49bb299",
  glicopia: "6004510b-9101-435e-9d63-9b64a77e840d",
  kirin: "c898fc88-3be3-4eb7-9b22-f129465bed86",
  zohei: "71c51be3-7b37-4bfe-b567-8f3c78bfa977",
  cupnoodle: "b179fa45-6501-46bd-bb84-9954c30256c4",
  meiji: "e6afe6b7-27c9-4aeb-a063-bd3dadef9aec",
  expocity: "1466ab51-cafe-4a9d-afc3-6361466c0c7c",
  grandfront: "33070452-64b9-4445-8952-39d5e1eef0b7",
  umie: "9d954839-9f6b-4ab8-8bcc-ecc065da89b9",
  kadoma: "67fdc883-b969-4efc-8e80-1db2542ee00c",
  pieri: "b30ab6d7-4216-4aa6-97f2-4724e6f59a1f",
  katsuragawa: "6299fb06-db52-4eeb-9040-c6f6793ef3c0",
  nambaParks: "681c77f8-a9e9-486b-9525-52e6a2d2c8f5",
  harukas: "11e2dc07-0404-4740-a67c-509d06be84c6",
  skybuilding: "6aacd9e5-b734-40c9-ad0e-359efa305ab6",
  tsutenkaku: "0d0e2d6e-aeeb-4004-8dee-00ed7322ec4a",
  kyotoTower: "a8a904fd-def1-453c-8977-fba563d8eaf3",
  kikuseidai: "48ac9ee4-faff-467b-bd56-14542b533b99",
  biwakoValley: "a3bcf315-341f-4ccb-91fb-014b664b9f71",
  amanohashidate: "5ef48972-e813-453d-b7d7-9e39f1b7d730",
  shirahige: "7a08b239-5df7-4162-ba56-21c420265ea6",
  torokko: "60a7fcb5-f8b8-4e1e-9101-44d679384dbd",
  asuka: "bd2672af-b5a2-45d1-a213-5f8a7478d159",
  kyoho: "782198cc-546f-4ded-b9ad-62add2857538",
  nanrakuen: "be590506-eabd-46ed-8840-7fd5ce977a36",
  blumen: "abdb62cc-b8d3-44d5-9d7f-6e137a8c0f20",
  michigan: "9e5ce38a-3695-4bd7-baf2-9d64f97e6aa1",
  naraPark: "6bd9dfbe-4d3f-40d8-ade8-0b21e52e631a",
}

const spot = (id) => `\n:::spot ${id}\n`

const ARTICLES = [
  {
    slug: "kansai-day-onsen-spa",
    title: "【関西】日帰り温泉・スパ8選｜雨の日も一日ゆっくり",
    type: "feature",
    tags: ["rainy-day-ok", "all-day", "adults-too"],
    excerpt: "遊び疲れた週末の回復も、雨の日の行き先も、温泉がぜんぶ引き受けてくれます。関西の日帰り温泉・スパを、街なか型からテーマパーク型まで8か所まとめました。",
    body: `「今週末はどこも行く気力がない」——そんな週こそ温泉です。関西には電車で行ける街なかの湯から、一日中こもれる温泉テーマパークまで、日帰りで楽しめる施設がそろっています。

料金プランや岩盤浴の有無は施設ごとに大きく違います。各カードの情報確認日を見て、出発前に公式サイトで最新の料金と営業時間をご確認ください。

## 一日こもれる温泉テーマパーク

湯船だけでなく、岩盤浴・休憩スペース・食事処まで揃った大型施設なら、朝から晩までいられます。館内着で過ごせるので、本や タブレットを持ち込んでだらだらするのも正解です。
${spot(S.spaWorld)}
${spot(S.soraniwa)}
${spot(S.taiko)}
## 街と港の湯

買い物や観光のついでに寄れる立地も、日帰り温泉の大事な条件です。夜景や港の景色と合わせて楽しめる施設を選びました。
${spot(S.manyo)}
${spot(S.ren)}
${spot(S.suminoeSpa)}
## 旅先の名湯を日帰りで

観光地の温泉は、宿泊しなくても日帰り入浴で楽しめるところがあります。行程の最後に組み込むと、帰りの車内や電車がぐっと楽になります。
${spot(S.fufu)}
${spot(S.sakinoyu)}
## 日帰り温泉を快適に使うコツ

- タオルは有料レンタルの施設が多いので、持参すると節約になります
- 食事後すぐの入浴は避け、湯上がりの水分補給を忘れずに
- 子ども連れの場合は年齢制限やおむつ利用の可否を事前に確認

温泉は「行けば必ず満足する」数少ないおでかけ先です。候補を2〜3か所持っておくと、天気や気分で使い分けられます。`,
  },
  {
    slug: "kansai-factory-tours",
    title: "【関西】工場見学・社会見学5選｜無料で学べて雨でもOK",
    type: "feature",
    tags: ["rainy-day-ok", "family", "elementary"],
    excerpt: "お菓子ができる瞬間、お金が生まれる現場。関西の工場見学・社会見学スポットは無料や低価格のものが多く、雨の日の学び系おでかけにぴったりです。",
    body: `工場見学は「タダで楽しめて、しかも学びになる」おでかけの優等生です。関西にはお菓子・麺・ビール・貨幣と、テーマの違う見学施設がそろっています。

多くの施設が事前予約制です。人気の見学ツアーは週末分が早く埋まるので、行きたい日が決まったらまず予約状況を確認してください。

## お菓子と麺の工場

子どもの食いつきが最も良いのが、お菓子とインスタント麺の工場です。見慣れた商品が生まれる工程は、大人が見ても飽きません。
${spot(S.glicopia)}
${spot(S.cupnoodle)}
${spot(S.meiji)}
## 大人の社会見学

ビールの製造工程や貨幣の歴史は、どちらかというと大人向け。子どもの自由研究テーマにもなる内容です。
${spot(S.kirin)}
${spot(S.zohei)}
## 工場見学を楽しむコツ

- 事前予約の要否と集合時間を必ず確認する (遅刻すると参加できないことがあります)
- 見学は歩く時間が長いので、歩きやすい靴で
- 記念撮影ができるスポットが用意されている施設が多いので、カメラを忘れずに

見学のあとに売店で「できたて」や限定品を買うところまでが工場見学です。荷物に余裕を持って出かけてください。`,
  },
  {
    slug: "kansai-rainy-day-malls",
    title: "【関西】雨の日に強い大型モール7選｜一日過ごせる商業施設",
    type: "feature",
    tags: ["rainy-day-ok", "all-day", "baby-friendly"],
    excerpt: "雨の週末の最終兵器は、駅直結・屋内完結の大型モール。遊び場・映画館・フードコートが揃った関西の商業施設を7つ選びました。",
    body: `雨の週末、屋内遊び場は混みます。そんな日に頼りになるのが、遊び場・食事・買い物がひとつ屋根の下に揃った大型モールです。ベビーカーのまま一日動けるのも、子ども連れには大きい。

モールの営業時間やテナントは変わることがあります。目当ての店がある場合は、公式サイトのフロアガイドで最新情報をご確認ください。

## 遊び場と体験が強いモール

買い物のついでに遊ぶのではなく「遊びに行ったら買い物もできる」タイプ。一日の主役になれるモールです。
${spot(S.expocity)}
${spot(S.kadoma)}
${spot(S.grandfront)}
## 景色ごと楽しむモール

海や湖に面したモールは、屋内にいても景色が変わるのが良いところ。雨が上がったらデッキ散歩に切り替えられます。
${spot(S.umie)}
${spot(S.pieri)}
## 街の拠点になるモール

駅からのアクセスが良く、映画館や屋上庭園まで揃った定番どころ。待ち合わせにも使いやすい施設です。
${spot(S.nambaParks)}
${spot(S.katsuragawa)}
## モールで一日過ごすコツ

- フードコートはお昼のピークを外す (11時台か14時以降)
- ベビー休憩室の場所を最初に確認しておくと安心
- 駐車サービスの条件 (購入金額など) は施設ごとに違います

「雨だからモール」は消極的な選択ではありません。行き先を1か所に絞らず、モール+近くの屋内施設の2段構えにしておくと、混雑にも対応できます。`,
  },
  {
    slug: "kansai-view-spots",
    title: "【関西】展望台・絶景スポット8選｜昼も夜も景色を見に行く",
    type: "feature",
    tags: ["date", "adults-too", "family"],
    excerpt: "300mの展望台から湖に立つ鳥居まで。関西の「景色そのものが目的地になる」スポットを、都心のタワーから山上・湖上まで8か所まとめました。",
    body: `おでかけの目的が「景色」だけの日があっていい。関西には、都心の超高層展望台から、山の上、湖の上まで、視界が一気に開ける場所がそろっています。

展望施設は天候で見え方が大きく変わります。雲が多い日は割り切って夜景に切り替えるなど、時間帯で調整するのがおすすめです。

## 都心のタワーと展望台

駅から歩いて行ける展望スポットは、買い物や食事と組み合わせやすいのが強み。雨の日でもガラス越しに景色を楽しめます。
${spot(S.harukas)}
${spot(S.skybuilding)}
${spot(S.tsutenkaku)}
${spot(S.kyotoTower)}
## 山の上から見下ろす

ケーブルやロープウェイで上がる展望地は、移動そのものがアトラクションです。市街地より気温が下がるので、羽織るものを1枚持って行ってください。
${spot(S.kikuseidai)}
${spot(S.biwakoValley)}
${spot(S.amanohashidate)}
## 水辺の絶景

建物からではなく、水辺の風景そのものが絶景になっている場所もあります。朝夕の光で表情が変わるので、時間を選んで訪れる価値があります。
${spot(S.shirahige)}
## 展望スポットを楽しむコツ

- 空気が澄む秋〜冬は遠くまで見える確率が上がります
- 夕方に着いて「昼景→夕景→夜景」と変化を見るのが一番お得
- 山上は市街地より5℃前後涼しいことがあります

景色は混雑しません。人混みに疲れた週末の行き先として、展望スポットを覚えておいて損はありません。`,
  },
  {
    slug: "kansai-autumn-outing",
    title: "【関西】秋のおでかけ8選｜紅葉・味覚狩り・秋晴れの公園",
    type: "seasonal",
    season: "autumn",
    tags: ["family", "picnic", "no-reservation"],
    excerpt: "暑さが抜けたら、外で過ごすのが気持ちいい季節。渓谷の紅葉列車からぶどう狩り、芝生の公園まで、関西の秋を楽しむスポットを集めました。",
    body: `関西の秋は短い。だからこそ、涼しくなったらすぐ動けるように行き先リストを持っておきたい季節です。この記事では「紅葉」「味覚狩り」「秋晴れの外遊び」の3テーマで、秋のおでかけ先をまとめました。

紅葉の見頃や収穫時期は年によってずれます。各カードの情報確認日を見つつ、直前に公式情報で状況をご確認ください。

## 紅葉と乗り物

紅葉は「歩いて見る」だけではありません。列車やロープウェイから眺める紅葉は、小さな子ども連れでも無理がなく、混雑した名所を歩き回るより快適なことも多いです。
${spot(S.torokko)}
${spot(S.biwakoValley)}
${spot(S.michigan)}
## 秋の味覚を採りに行く

ぶどう・みかん・さつまいも。味覚狩りは「食べる」というごほうびが最後に待っているので、子どものやる気が最後まで続きます。
${spot(S.kyoho)}
${spot(S.nanrakuen)}
${spot(S.blumen)}
## 秋晴れの日の外歩き

夏には暑すぎた広い公園や史跡巡りは、秋がベストシーズンです。芝生にレジャーシートを広げるだけで、十分いい一日になります。
${spot(S.asuka)}
${spot(S.naraPark)}
## 秋のおでかけを楽しむコツ

- 朝晩の寒暖差が大きいので、脱ぎ着できる服装で
- 味覚狩りは収穫状況で受付を締め切ることがあります。当日朝の確認が確実です
- 行楽シーズンの高速道路は夕方の渋滞が読めないため、早出早帰りが基本

秋は行事も多く、週末があっという間に埋まります。「今週は近場、来週は遠出」とリズムを決めておくと、短い季節を使い切れます。`,
  },
]

async function main() {
  const { data: places } = await supabase.from("places").select("id,name").eq("is_published", true)
  const valid = new Map((places ?? []).map((p) => [p.id, p.name]))
  const { data: tagRows } = await supabase.from("tags").select("id,slug").is("canonical_tag_id", null)
  const tagBySlug = new Map((tagRows ?? []).map((t) => [t.slug, t.id]))

  let broken = 0
  for (const article of ARTICLES) {
    const ids = [...article.body.matchAll(/:::spot\s+([0-9a-f-]{36})/g)].map((m) => m[1])
    const missing = ids.filter((id) => !valid.has(id))
    if (missing.length > 0) {
      broken += 1
      console.log(`NG   ${article.slug}: 未解決 ${missing.length} 件`)
      missing.forEach((id) => console.log(`       不明ID ${id}`))
      continue
    }
    const chars = article.body.replace(/:::spot[^\n]*/g, "").replace(/\s/g, "").length
    console.log(`OK   ${article.slug}`)
    console.log(`       ${article.title}`)
    console.log(`       見出し${(article.body.match(/^## /gm) || []).length} / スポット${ids.length} / 地の文${chars}字`)
  }
  if (broken > 0) {
    console.error(`\n${broken} 本に未解決の参照があります。入稿を中止しました。`)
    process.exit(1)
  }

  if (!apply) {
    console.log("\n(確認モード) --apply で入稿します")
    return
  }

  let created = 0
  for (const article of ARTICLES) {
    const ids = [...new Set([...article.body.matchAll(/:::spot\s+([0-9a-f-]{36})/g)].map((m) => m[1]))]
    const { data, error } = await supabase
      .from("articles")
      .upsert({
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        body: article.body,
        article_type: article.type,
        season: article.season ?? null,
        prefecture: null,
        status: "published",
        published_at: new Date().toISOString(),
        author_name: "デカケル編集部",
        seo_description: article.excerpt,
      }, { onConflict: "slug" })
      .select("id")
      .single()
    if (error) { console.log(`FAIL ${article.slug}: ${error.message}`); continue }

    await supabase.from("article_places").delete().eq("article_id", data.id)
    await supabase.from("article_places").insert(
      ids.map((placeId, index) => ({ article_id: data.id, place_id: placeId, sort_order: index })),
    )
    await supabase.from("article_tags").delete().eq("article_id", data.id)
    const tagIds = (article.tags ?? []).map((slug) => tagBySlug.get(slug)).filter(Boolean)
    if (tagIds.length > 0) {
      await supabase.from("article_tags").insert(tagIds.map((tagId) => ({ article_id: data.id, tag_id: tagId })))
    }
    created += 1
    console.log(`入稿 ${article.slug} (スポット${ids.length} / タグ${tagIds.length})`)
  }
  console.log(`\nDONE: ${created} 本`)
}

main().catch((error) => { console.error(error); process.exit(1) })
