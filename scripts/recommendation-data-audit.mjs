import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const schemaProbe = await supabase.from("places").select("id,mood_tags,meal_available").limit(1)
const { data, error } = await supabase
  .from("places")
  .select(
    "id,name,description,prefecture,city,indoor_type,target_ages,price_type,rainy_day_ok,image_url",
  )
  .eq("is_published", true)
  .limit(1000)

if (error) throw error

const rows = data ?? []
const currentFoodPattern = /市場|グルメ|レストラン|カフェ|道の駅|食|いちご|果物/
const strictFoodPattern =
  /レストラン|カフェ|喫茶|市場|グルメ|スイーツ|菓子|パン|ラーメン|うどん|そば|寿司|焼肉|バーベキュー|BBQ|食べ放題|食事|飲食|フード|果物狩り|いちご狩り|味覚狩り|道の駅/i

const text = (row) => `${row.name} ${row.description ?? ""}`
const currentFoodMatches = rows.filter((row) => currentFoodPattern.test(text(row)))
const strictFoodMatches = rows.filter((row) => strictFoodPattern.test(text(row)))
const falsePositiveExamples = currentFoodMatches
  .filter((row) => !strictFoodPattern.test(text(row)))
  .slice(0, 20)
  .map((row) => row.name)

console.log(
  JSON.stringify(
    {
      published: rows.length,
      recommendation_columns_available: !schemaProbe.error,
      current_food_matches: currentFoodMatches.length,
      strict_food_matches: strictFoodMatches.length,
      current_food_false_positive_examples: falsePositiveExamples,
      strict_food_examples: strictFoodMatches.slice(0, 20).map((row) => row.name),
    },
    null,
    2,
  ),
)
