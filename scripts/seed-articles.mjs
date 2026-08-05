/**
 * 記事10本の入稿。
 *
 * 方針: 本文の「事実」は施設DBのカード (:::spot) が担い、
 * 地の文は構成と読者への案内に徹する。DBに無い営業時間・料金・
 * イベント日程は本文に書かない (推測しないという運用方針に従う)。
 *
 * Dry run: node scripts/seed-articles.mjs
 * Apply:   node scripts/seed-articles.mjs --apply
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
  akoKaihin: "d5330d9b-cb2c-4e4b-abf9-a325a063f1cb",
  hanazono: "519829a8-273c-4cff-9c40-91d0118296ef",
  sandaike: "1b552a9e-3862-4654-a42a-9d78fcdc62af",
  sumaSeaworld: "dfe318be-1c5b-42bf-819e-b3ac08732f9f",
  chuoPool: "30445785-00d4-4a99-87d2-54068d88bc7c",
  iwadeSogo: "6fe46bfd-66b0-4ff9-8719-2c6e793a2b4b",
  ibarakiUndo: "dee4b1e8-45ad-464b-8930-67a23c2bb4f1",
  sennanLong: "44429fb0-0416-47ae-8ed9-d8897ab6619a",
  theLab: "1ae11fa1-e79f-4864-a03f-7823a44b1e8f",
  chickenRamen: "e50cd32b-15dc-442e-9b8c-488ffa10df53",
  kyotoRailway: "a4b7888b-4ec8-48d4-b2ab-1900c77d4d1c",
  hiyoshiArena: "81e82918-ad4a-4410-989f-c8a027553f57",
  vsPark: "9ec69d43-907f-442a-bd97-f2d8264d3683",
  mangaMuseum: "e5e5ae8b-a570-4c5d-b953-fe14f3366feb",
  kingyo: "aab0d873-55a9-4941-84b7-d4c64802104a",
  kobeAnimal: "91111de1-3082-4a99-8de7-00ea49617a0c",
  tennojiZoo: "69ff0a27-c516-467a-9423-dde308106a0b",
  kyotoAquarium: "e732758f-b015-4aef-9679-6e204150cf26",
  adventureWorld: "5ab97562-8254-49fc-adce-d0058b8011b3",
  yodel: "8adc0941-ff47-4bdb-b8fe-0c510277eeae",
  fruitFlower: "9f41124a-5093-42d7-b958-02cf1a9bca1e",
  hattori: "5bda9cf2-98bd-469c-a3b9-6d48981d0913",
  sayamaike: "44b848eb-6507-4043-8e5b-97b5084ecbac",
  kongo: "7cc7ca9a-fd53-45a6-a71a-a8588d88d1e4",
  shiawase: "b9d38b96-964b-4adc-8b94-cb7aca5df869",
  greenia: "598ab811-ae10-48d4-9d2a-b77be9a751e9",
  jiyuNoOka: "62c2ba4d-15f6-4612-a589-5229e6550b73",
  amagasakiChuo: "4441025a-7f02-42ee-a610-d41f1c13dedb",
  takaragaike: "5898c35d-2e26-4fdd-aa9b-5aaffc348c57",
  okazaki: "36427fc2-acd5-4cbd-bafe-07dbe3eb3139",
  logosLand: "e474bffb-a4c9-4caa-a464-d7a66bec2d5e",
  nishiyama: "25394b07-ef33-4cb3-a008-924924b40ee4",
  ikomaSanroku: "990d0a17-b550-4d45-ae97-ac029993f7c4",
  ikomaYuenchi: "5dd516ba-c7b0-40b8-a854-d02d6174a78b",
  umamiKyuryo: "279be847-3994-4037-a3b6-e141a3b28074",
  kashiharaKagaku: "dcebe77d-9254-40bd-b9f4-621dad592f40",
  mitsue: "a0671e6b-7c72-48db-80b1-19a833e8aca3",
  shigaToshokan: "b2b707d9-9911-468e-bf31-c3931bbde4a1",
  hiraGenki: "62b9c8d4-9a90-4262-b187-33e7f7262e03",
  blumen: "abdb62cc-b8d3-44d5-9d7f-6e137a8c0f20",
  nagiNoKi: "cdc43bbd-2a1d-49f0-9aed-28ff92267883",
  mieRiver: "3fddf2b2-cde4-4f46-a626-65f660941638",
  wakayamaWakuwaku: "c9b6a53e-22f2-49b8-b6d9-ecfeb0b365b1",
  marinaCity: "83f3bb40-3579-4be0-803f-f8c7c672c1a0",
  kimiidera: "b916ee68-b295-41af-8f32-12490624ae1c",
  kameGawa: "aad49ead-8bba-448c-be9f-cd0461b0e396",
  suminoe: "25140de5-7316-4999-8baf-37792f90f56b",
  boernelund: "716f6497-0fd5-4f04-8aae-13889aeceb66",
  kasaChiku: "40d10392-ce76-4249-b74e-6872dfbed5e7",
  gokashoPark: "d9023293-4545-4bfc-b181-4d8ec457ba40",
  koraSakura: "d4be19f1-0017-48fc-90de-893271cfa4da",
  ukishima: "59ffb560-7433-498b-b0c1-85865575a796",
}

const spot = (id) => `\n:::spot ${id}\n`

const ARTICLES = [
  {
    slug: "kansai-summer-water-play",
    title: "【関西】水遊びができるスポット7選｜プール・海辺・じゃぶじゃぶ池",
    type: "seasonal",
    season: "summer",
    tags: ["water-play", "summer-vacation", "family"],
    excerpt: "暑い日は、水のあるところへ。プール、海辺の公園、じゃぶじゃぶ池まで、関西で水遊びができるスポットを目的別にまとめました。",
    body: `関西の夏は、外に出るだけで体力を奪われます。それでも子どもは水さえあれば何時間でも遊べるもの。この記事では「本格的に泳ぎたい」「無料で水にふれたい」「暑さを避けて屋内で」という3つの目的に分けて、関西で水遊びができるスポットを紹介します。

料金や開設期間は施設ごとに変わります。各カードの情報確認日を見て、出発前に公式サイトで最新情報をご確認ください。

## 海のそばで一日過ごす

海辺の公園は、砂浜・芝生・遊具がひとつの敷地に揃っていることが多く、水に飽きた子どもの逃げ場があるのが利点です。日差しを遮るものが少ないので、テントや日傘があると滞在が楽になります。
${spot(S.akoKaihin)}
${spot(S.sennanLong)}
## 無料で水にふれられる公園

「プールに行くほどではないけれど、少し水遊びさせたい」という日に向くのが、水遊び場のある公園です。着替えとタオル、サンダルだけで出かけられる手軽さがあります。
${spot(S.hanazono)}
${spot(S.mieRiver)}
## プールがある複合公園

遊具とプールが同じ公園にあると、午前は遊具、午後はプールという組み立てができます。移動が要らないぶん、小さい子ども連れの負担が減ります。
${spot(S.sandaike)}
${spot(S.iwadeSogo)}
## 暑さと日差しを避けたいとき

真夏の屋外がつらい日や、日焼けを避けたい日は屋内プールという手があります。天候に左右されないので、予定を立てやすいのも利点です。
${spot(S.chuoPool)}
## 水遊びに持っていくもの

- 着替え一式とタオル（濡れる前提で多めに）
- 脱ぎ履きしやすいサンダル
- 日よけ（帽子・ラッシュガード・テント）
- 飲み物（自販機が混む時間帯があります）

水遊びのあとは体が冷えます。気温が高くても羽織るものを1枚持っておくと安心です。`,
  },
  {
    slug: "kansai-rainy-day-indoor",
    title: "【関西】雨の日でも楽しめる屋内スポット8選",
    type: "feature",
    tags: ["rainy-day-ok", "family", "all-day"],
    excerpt: "予定していた公園が雨で流れても大丈夫。関西で、雨の日にこそ行きたい屋内スポットを年齢別に集めました。",
    body: `週末の朝に雨。予定していた公園は諦めるしかない——そんなときのための記事です。関西には、天候に関係なく一日遊べる屋内施設がそろっています。

雨の日は屋内施設が混みやすく、駐車場が早い時間に埋まることもあります。行き先を決めたら、早めに家を出るのがおすすめです。

## 体を動かしたい日に

雨でエネルギーが余っている日は、屋内で思い切り動ける施設が向いています。着替えを持っていくと、汗をかいても帰りが快適です。
${spot(S.hiyoshiArena)}
${spot(S.vsPark)}
## 見て・知って楽しむ

じっくり見て回るタイプの施設は、雨の日の長い時間を埋めるのに向いています。展示のボリュームがあるぶん、途中で休憩をはさむ前提で計画すると疲れにくくなります。
${spot(S.kyotoRailway)}
${spot(S.theLab)}
## 動物に会える屋内スポット

動物園は雨だと厳しいことが多いのですが、屋内型なら天候をほぼ気にせず楽しめます。
${spot(S.kobeAnimal)}
${spot(S.kyotoAquarium)}
## 静かに過ごしたい日に

騒がしいのが苦手な子や、大人も一緒に休みたい日には、落ち着いた空間を選ぶ手もあります。
${spot(S.mangaMuseum)}
${spot(S.kingyo)}
## 雨の日を快適に過ごすコツ

- 靴が濡れると一日中不快なので、替えの靴下を入れておく
- 傘より両手が空くレインコートのほうが子連れには扱いやすい
- 屋内は空調が効いているため、羽織るものを1枚

雨の日は「行き先を1つに絞らない」のもコツです。近くにもう1か所候補があると、混雑していたときに切り替えられます。`,
  },
  {
    slug: "kansai-free-spots",
    title: "【関西】無料で遊べるスポット8選｜入場料0円で一日楽しむ",
    type: "feature",
    tags: ["free", "family", "picnic"],
    excerpt: "入場料がかからないのに、遊具も広場も充実。関西で無料で遊べるスポットを、大型公園から屋内施設まで集めました。",
    body: `おでかけのたびに数千円かかると、回数が減ってしまいます。関西には入場無料で、しかも半日以上遊べる場所がたくさんあります。

なお「入場無料」でも駐車場が有料の施設はあります。各カードの料金欄と、公式サイトの最新情報をあわせてご確認ください。

## 一日いられる大型公園

無料の公園でも、大型遊具・芝生・広場がそろっていれば一日過ごせます。お弁当を持っていけば、費用はほぼ交通費だけです。
${spot(S.hattori)}
${spot(S.umamiKyuryo)}
${spot(S.takaragaike)}
## 遊具がしっかりしている市営公園

規模は控えめでも、複合遊具が充実していて地元で人気の公園です。混みすぎず、近所の子と自然に遊べる空気があります。
${spot(S.jiyuNoOka)}
${spot(S.nagiNoKi)}
${spot(S.kameGawa)}
## 無料で入れる屋内施設

雨の日や真夏・真冬に助かるのが、無料の屋内施設です。乳幼児向けの子育て支援センターや、図書館の児童コーナーは地域の人が日常的に使っています。
${spot(S.wakayamaWakuwaku)}
${spot(S.shigaToshokan)}
${spot(S.suminoe)}
## 無料スポットを気持ちよく使うために

無料の公園や施設の多くは、自治体や地域の方が維持しています。ゴミを持ち帰る、遊具を丁寧に使うといった当たり前のことが、次に来る家族のためになります。

「今日は無料スポット」と決めておくと、おでかけの回数そのものを増やせます。近所の公園を何か所か知っておくと、急に時間ができた日にも動けます。`,
  },
  {
    slug: "osaka-family-day-out",
    title: "【大阪】子どもと一日遊べるスポット7選｜屋内も公園も",
    type: "feature",
    prefecture: "大阪府",
    tags: ["family", "all-day", "elementary"],
    excerpt: "都心から山あいまで、大阪で子どもと一日過ごせるスポットを集めました。屋内施設と大型公園をバランスよく紹介します。",
    body: `大阪は、電車で30分も動けば街から自然まで景色が変わります。この記事では「一日そこにいられる」ことを基準に、大阪のおでかけスポットを紹介します。

## 体験して学べる屋内施設

見るだけでなく手を動かせる施設は、子どもの集中が続きやすく、帰ってからの会話も増えます。予約が必要な体験もあるので、事前に確認しておくと安心です。
${spot(S.chickenRamen)}
${spot(S.theLab)}
${spot(S.vsPark)}
## 大型遊具のある公園

大阪の公園は規模が大きく、遊具のバリエーションも豊富です。お弁当を持って行けば、そのまま昼をまたいで過ごせます。
${spot(S.hattori)}
${spot(S.hanazono)}
${spot(S.sayamaike)}
## 自然の中で過ごす

街から少し離れると、山や緑の中で過ごせる場所があります。歩く距離が長くなるので、履き慣れた靴で出かけてください。
${spot(S.kongo)}
## 大阪でのおでかけを組み立てるコツ

大阪は移動が短く済むぶん、午前と午後で場所を変える組み立てがしやすい地域です。「午前は屋内施設、午後は近くの公園」のように性質の違う2か所を組み合わせると、子どもが飽きにくくなります。

一方で夏場は移動そのものが負担になります。暑い時期は1か所に絞り、滞在時間を長くとるほうが快適です。`,
  },
  {
    slug: "hyogo-athletic-and-nature",
    title: "【兵庫】アスレチックと自然で遊ぶスポット6選",
    type: "feature",
    prefecture: "兵庫県",
    tags: ["athletic-tag", "family", "elementary"],
    excerpt: "六甲山から播磨まで、兵庫は体を動かして遊べる場所が豊富です。アスレチックと自然体験を中心に紹介します。",
    body: `兵庫は南に海、北に山があり、一日の過ごし方の幅が広い地域です。この記事では、体を動かして遊べるスポットを中心にまとめました。

アスレチックは施設によって身長・年齢の条件があります。参加できるかどうかは、必ず公式サイトで確認してからお出かけください。

## 本格的なアスレチック

しっかり体を動かしたい小学生以上に向くのが、規模の大きなアスレチックです。汗をかくので、着替えとタオルは必須と考えてください。
${spot(S.greenia)}
${spot(S.shiawase)}
## 動物とふれあいながら遊ぶ

遊ぶだけでなく動物と過ごせると、小さい子も一緒に楽しめます。年齢差のあるきょうだい連れにも向いています。
${spot(S.yodel)}
${spot(S.fruitFlower)}
## 海辺と街なかの公園

移動時間を短くしたい日は、街なかや海沿いの公園という選択肢もあります。
${spot(S.akoKaihin)}
${spot(S.amagasakiChuo)}
## 兵庫で遊ぶときの装備

- 山side（六甲・北区方面）は市街地より気温が低いことがあります
- アスレチックは軍手があると手のひらが痛くなりにくい
- 海辺は日差しが強く、日陰が少ない場所もあります

同じ兵庫県でも、神戸市街と山あい、播磨方面では体感が大きく変わります。行き先が決まったら、その地域の天気を個別に確認しておくと失敗が減ります。`,
  },
  {
    slug: "kyoto-with-kids",
    title: "【京都】子どもと楽しむスポット6選｜寺社めぐりだけじゃない",
    type: "feature",
    prefecture: "京都府",
    tags: ["family", "rainy-day-ok", "train-lover"],
    excerpt: "京都は観光地というイメージが強い場所ですが、子ども向けの施設や大型公園も充実しています。家族で行きやすいスポットを紹介します。",
    body: `京都でのおでかけというと寺社めぐりが浮かびますが、小さい子ども連れだと歩く距離が長く、静かにしていなければならない時間も増えます。この記事では、子どもが主役になれる京都のスポットを紹介します。

## 見応えのある屋内施設

雨の日や真夏でも予定が崩れないのが屋内施設の利点です。京都駅周辺には、家族で行きやすい大型施設がまとまっています。
${spot(S.kyotoRailway)}
${spot(S.kyotoAquarium)}
${spot(S.mangaMuseum)}
## 広い公園でのびのび過ごす

京都市内にも、自然の中で過ごせる大型公園があります。観光地の混雑を離れたい日にも向いています。
${spot(S.takaragaike)}
${spot(S.okazaki)}
${spot(S.nishiyama)}
## 京都を家族で回るときのコツ

京都市内は道路が混みやすく、駐車場も観光シーズンは埋まりがちです。目的地が駅の近くなら、電車のほうが読みやすいことがあります。

また、観光地の中心部と子ども向け施設は場所が離れていることが多いので、「今日は子ども中心」「今日は観光中心」と割り切ったほうが、結果的に満足度が上がります。`,
  },
  {
    slug: "nara-nature-and-play",
    title: "【奈良】自然と遊具を楽しむスポット6選",
    type: "feature",
    prefecture: "奈良県",
    tags: ["family", "athletic-tag", "picnic"],
    excerpt: "鹿と大仏だけではありません。奈良には大型遊具のある公園や、山あいの体験施設が点在しています。",
    body: `奈良は観光で訪れる場所という印象が強いかもしれませんが、地元の家族が日常的に使う公園や体験施設が各地にあります。この記事では、子どもと遊びに行く目線で奈良を紹介します。

## 山あいでしっかり遊ぶ

奈良は少し内陸に入ると山が近く、斜面を活かした長い滑り台やアスレチックがあります。歩く距離が出るので、動きやすい服装で出かけてください。
${spot(S.ikomaSanroku)}
${spot(S.mitsue)}
## 広い公園でゆっくり

大型の丘陵公園は、遊具エリアと広場が分かれていることが多く、年齢差のあるきょうだいでも過ごしやすい構造です。
${spot(S.umamiKyuryo)}
${spot(S.kasaChiku)}
## 屋内でじっくり楽しむ

暑い日や雨の日は、屋内施設が頼りになります。
${spot(S.kashiharaKagaku)}
${spot(S.kingyo)}
## 少し足を伸ばすなら

ケーブルカーで登る山上の遊園地など、移動そのものが体験になる場所もあります。
${spot(S.ikomaYuenchi)}
## 奈良でのおでかけメモ

奈良は東西・南北で移動時間が大きく変わります。奈良市内から南部・東部の山あいへは、地図上の距離より時間がかかることがあるので、出発前に所要時間を調べておくと予定が崩れません。`,
  },
  {
    slug: "shiga-lake-and-park",
    title: "【滋賀】水辺と公園で過ごすスポット6選",
    type: "feature",
    prefecture: "滋賀県",
    tags: ["water-play", "family", "picnic"],
    excerpt: "琵琶湖のある滋賀は、水辺と公園の組み合わせが豊富。県内で子どもと過ごしやすいスポットを紹介します。",
    body: `滋賀は琵琶湖を中心に、水辺と自然が身近にある地域です。大阪や京都から車で行きやすく、日帰りのおでかけ先としても選びやすい場所にあります。

## 水辺で過ごす

川沿いや湖畔の公園は、水の音があるだけで涼しく感じられます。水辺では目を離さないよう、大人の配置を決めてから遊ばせると安心です。
${spot(S.mieRiver)}
## 遊具が充実した公園

滋賀の市営公園は駐車場が無料の場所が多く、車で行きやすいのが利点です。
${spot(S.nagiNoKi)}
${spot(S.gokashoPark)}
${spot(S.koraSakura)}
## 自然の中で体を動かす

山の中にある施設なら、市街地より涼しく過ごせることがあります。
${spot(S.hiraGenki)}
## 一日過ごせるテーマパーク

じっくり時間を使いたい日には、複数の遊びがまとまった施設が向いています。
${spot(S.blumen)}
## 雨や暑さが厳しい日は

屋内の無料施設を1つ知っておくと、天候が崩れた日に助かります。
${spot(S.shigaToshokan)}
## 滋賀でのおでかけメモ

滋賀は湖の東西で移動時間がかなり変わります。琵琶湖をぐるりと回るルートは想像より時間がかかるので、行き先は湖のどちら側かを最初に決めておくと計画が立てやすくなります。`,
  },
  {
    slug: "wakayama-animals-and-sea",
    title: "【和歌山】動物と海を楽しむスポット6選",
    type: "feature",
    prefecture: "和歌山県",
    tags: ["animal-encounter", "family", "all-day"],
    excerpt: "パンダで知られるアドベンチャーワールドから、地元で愛される市営公園まで。和歌山のおでかけスポットを紹介します。",
    body: `和歌山は南北に長く、白浜方面まで足を伸ばすと移動に時間がかかります。この記事では「一日かけて行く場所」と「近場で気軽に遊べる場所」を分けて紹介します。

## 一日かけて行きたい大型施設

移動時間をかけてでも行く価値がある、規模の大きな施設です。滞在時間を長めに見て、朝早めに出発するのがおすすめです。
${spot(S.adventureWorld)}
${spot(S.marinaCity)}
## 市街地で気軽に遊べる公園

和歌山市周辺には、地元の子育て世帯が日常的に使う公園があります。無料で駐車場もあるので、思い立った日に出かけられます。
${spot(S.kimiidera)}
${spot(S.kameGawa)}
${spot(S.iwadeSogo)}
## 自然の中で過ごす

熊野方面に近づくと、自然の濃さが変わります。観光とあわせて立ち寄れる公園もあります。
${spot(S.ukishima)}
## 雨の日・小さい子連れの日に

乳幼児連れの日や天気が崩れた日は、屋内の無料施設が助かります。
${spot(S.wakayamaWakuwaku)}
## 和歌山でのおでかけメモ

和歌山市から白浜方面までは、高速道路を使ってもまとまった時間がかかります。南部へ行く日は「行き先1か所」と決めて、余裕のある行程にするほうが快適です。`,
  },
  {
    slug: "kansai-near-station",
    title: "【関西】駅から近いおでかけスポット6選｜車がなくても行ける",
    type: "howto",
    tags: ["near-station", "no-reservation", "family"],
    excerpt: "車がなくても、電車とベビーカーで行ける場所はたくさんあります。駅から歩いて行ける関西のおでかけスポットを紹介します。",
    body: `関西は私鉄網が発達していて、車を持たない子育て世帯も多い地域です。それでも「おでかけ＝車」という前提の情報が多く、電車で行ける場所は探しにくいのが実情です。

この記事では、駅から歩いて行けるスポットを紹介します。各カードには最寄り駅と徒歩の目安を載せているので、行けるかどうかをその場で判断できます。

## 京都駅周辺にまとまっている施設

京都駅の西側、梅小路エリアには大型施設が近接しています。1日で2か所回ることもできます。
${spot(S.kyotoRailway)}
${spot(S.kyotoAquarium)}
## 大阪の街なかにある施設

大阪は駅から近い屋内施設が多く、天候に左右されにくいのが利点です。
${spot(S.theLab)}
${spot(S.vsPark)}
## 神戸・三宮から行ける場所

神戸は駅からの距離が近く、電車移動と相性のよい街です。
${spot(S.boernelund)}
${spot(S.sumaSeaworld)}
## 電車でのおでかけを楽にするコツ

- ベビーカーはエレベーターの位置を先に調べておくと乗り換えが速い
- 荷物は多くなりがちなので、コインロッカーの有無を確認しておく
- 混雑する時間帯を避けると、座って移動できて到着後の体力が残る

車がないと選択肢が狭いと思われがちですが、駅近の施設に絞れば、渋滞や駐車場探しがないぶん、かえって予定が読みやすくなります。`,
  },
]

async function main() {
  // 参照している施設が実在し公開されているかを先に確認する
  const { data: places } = await supabase.from("places").select("id,name").eq("is_published", true)
  const valid = new Map((places ?? []).map((p) => [p.id, p.name]))
  const { data: tagRows } = await supabase.from("tags").select("id,slug").is("canonical_tag_id", null)
  const tagBySlug = new Map((tagRows ?? []).map((t) => [t.slug, t.id]))

  let broken = 0
  for (const article of ARTICLES) {
    const ids = [...article.body.matchAll(/:::spot\s+([0-9a-f-]{36})/g)].map((m) => m[1])
    const missing = ids.filter((id) => !valid.has(id))
    const undefinedRefs = article.body.match(/:::spot\s+undefined/g)
    if (missing.length > 0 || undefinedRefs) {
      broken += 1
      console.log(`NG   ${article.slug}: 未解決 ${missing.length + (undefinedRefs?.length ?? 0)} 件`)
      missing.forEach((id) => console.log(`       不明ID ${id}`))
      if (undefinedRefs) console.log(`       undefined 参照 ${undefinedRefs.length} 件`)
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
        prefecture: article.prefecture ?? null,
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
