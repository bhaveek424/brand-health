import { Review } from "@/lib/schema";
import { findThemesByKeywords } from "./themes";

function mkReview(
  overrides: Partial<Review> & Pick<Review, "id" | "marketplace" | "market" | "language" | "rating" | "title" | "body">
): Review {
  const summary =
    overrides.normalized_summary ?? overrides.body ?? "";
  const sentiment: Review["sentiment"] =
    overrides.sentiment ??
    (overrides.rating && overrides.rating <= 2
      ? "negative"
      : overrides.rating === 3
      ? "neutral"
      : "positive");
  const theme_ids =
    overrides.theme_ids ?? findThemesByKeywords(overrides.body + " " + overrides.title);
  return {
    product_id: "prod_tower_24cm_pan",
    date: "2024-11-01",
    verified_purchase: true,
    helpful_count: 0,
    ...overrides,
    normalized_summary: summary,
    sentiment,
    theme_ids,
  };
}

// ========================
// BASELINE PERIOD (~last month)
// ~100 reviews, handle breakage ~2%
// ========================
export const baselineReviews: Review[] = [
  // Positive baseline (English)
  mkReview({ id: "r_b_001", marketplace: "amazon_in", market: "IN", language: "en", rating: 5, title: "Great pan for everyday cooking", body: "Love the non-stick surface. Eggs slide right off. Lightweight and easy to clean.", date: "2024-10-05" }),
  mkReview({ id: "r_b_002", marketplace: "amazon_in", market: "IN", language: "en", rating: 4, title: "Good value pan", body: "Solid build. Heats evenly. The handle could be more ergonomic but overall happy.", date: "2024-10-08" }),
  mkReview({ id: "r_b_003", marketplace: "flipkart_in", market: "IN", language: "en", rating: 5, title: "Tower never disappoints", body: "Have 3 Tower pans now. Consistent quality. Delivery was fast too.", date: "2024-10-10" }),
  mkReview({ id: "r_b_004", marketplace: "noon_uae", market: "UAE", language: "en", rating: 5, title: "Perfect for my kitchen", body: "Exactly what I needed. Non-stick works great even with minimal oil.", date: "2024-10-12" }),
  mkReview({ id: "r_b_005", marketplace: "noon_ksa", market: "KSA", language: "en", rating: 4, title: "Very good quality", body: "Heavy enough to feel premium. Cleans easily. Would recommend.", date: "2024-10-14" }),
  mkReview({ id: "r_b_006", marketplace: "amazon_in", market: "IN", language: "en", rating: 5, title: "Best pan under 1500", body: "Better than local brands. Handle stays cool. Coating is holding up after 2 months.", date: "2024-10-15" }),
  mkReview({ id: "r_b_007", marketplace: "flipkart_in", market: "IN", language: "en", rating: 4, title: "Nice purchase", body: "Size is perfect for a family of 3. No issues so far.", date: "2024-10-16" }),
  mkReview({ id: "r_b_008", marketplace: "noon_uae", market: "UAE", language: "en", rating: 5, title: "Excellent non-stick", body: "Been using daily for a month. Nothing sticks. Very satisfied.", date: "2024-10-17" }),
  mkReview({ id: "r_b_009", marketplace: "amazon_in", market: "IN", language: "en", rating: 3, title: "Average, expected more", body: "It's okay. Non-stick is fine but the pan feels a bit thin.", date: "2024-10-18" }),
  mkReview({ id: "r_b_010", marketplace: "noon_ksa", market: "KSA", language: "en", rating: 4, title: "Good pan", body: "Happy with the purchase. Good size for morning eggs.", date: "2024-10-19" }),
  mkReview({ id: "r_b_011", marketplace: "amazon_in", market: "IN", language: "en", rating: 5, title: "Love it", body: "Easy to use, easy to clean. What more do you need?", date: "2024-10-20" }),
  mkReview({ id: "r_b_012", marketplace: "flipkart_in", market: "IN", language: "en", rating: 4, title: "Worth the price", body: "Good value for money. No complaints after 3 weeks.", date: "2024-10-21" }),
  mkReview({ id: "r_b_013", marketplace: "noon_uae", market: "UAE", language: "en", rating: 5, title: "Top notch", body: "Surprised by the quality at this price point. Will buy again.", date: "2024-10-22" }),
  mkReview({ id: "r_b_014", marketplace: "amazon_in", market: "IN", language: "en", rating: 4, title: "Nice pan", body: "Does what it says. Heats quickly and evenly.", date: "2024-10-23" }),
  mkReview({ id: "r_b_015", marketplace: "noon_uae", market: "UAE", language: "en", rating: 5, title: "Fantastic", body: "Best frying pan I have owned. The coating is durable.", date: "2024-10-24" }),
  mkReview({ id: "r_b_016", marketplace: "flipkart_in", market: "IN", language: "en", rating: 5, title: "Great", body: "Very happy. Good packaging too.", date: "2024-10-25" }),
  mkReview({ id: "r_b_017", marketplace: "noon_ksa", market: "KSA", language: "en", rating: 4, title: "Very satisfied", body: "Using it daily. Handle is comfortable.", date: "2024-10-26" }),
  mkReview({ id: "r_b_018", marketplace: "amazon_in", market: "IN", language: "en", rating: 3, title: "Decent", body: "Not bad for the price.", date: "2024-10-27" }),
  mkReview({ id: "r_b_019", marketplace: "noon_uae", market: "UAE", language: "en", rating: 5, title: "Highly recommend", body: "Quality exceeds expectations. Easy to clean.", date: "2024-10-28" }),
  mkReview({ id: "r_b_020", marketplace: "flipkart_in", market: "IN", language: "en", rating: 4, title: "Good product", body: "Build quality is nice. Non-stick performing well.", date: "2024-10-29" }),

  // Positive baseline (Hindi/Hinglish)
  mkReview({ id: "r_b_021", marketplace: "amazon_in", market: "IN", language: "hi", rating: 5, title: "बहुत अच्छा पैन", body: "Non-stick बहुत अच्छा काम करता है। साफ करना आसान है। Price भी सही है।", date: "2024-10-05", normalized_summary: "Very good pan. Non-stick works well. Easy to clean. Price is right." }),
  mkReview({ id: "r_b_022", marketplace: "flipkart_in", market: "IN", language: "hi", rating: 4, title: "ठीक-ठाक प्रोडक्ट", body: "साइज सही है। Heating भी अच्छी है। Value for money hai.", date: "2024-10-08", normalized_summary: "Okay product. Size is right. Heating is good. Value for money." }),
  mkReview({ id: "r_b_023", marketplace: "amazon_in", market: "IN", language: "hi", rating: 5, title: "Tower brand best hai", body: "Pehle se Tower use kar raha hoon. Quality consistent hai. Recommend karta hoon.", date: "2024-10-10", normalized_summary: "Tower brand is best. Using for a while. Consistent quality. Recommend." }),
  mkReview({ id: "r_b_024", marketplace: "flipkart_in", market: "IN", language: "hi", rating: 4, title: "अच्छी खरीद", body: "Packaging achhi thi. Pan bhi sahi condition mein aaya. Abhi tak koi issue nahi.", date: "2024-10-12", normalized_summary: "Good purchase. Packaging was good. Pan arrived in good condition. No issues yet." }),
  mkReview({ id: "r_b_025", marketplace: "amazon_in", market: "IN", language: "hi", rating: 5, title: "घर के लिए बढ़िया", body: "4 logon ke family ke liye perfect size. Non-stick bina oil ke bhi kaam karta hai.", date: "2024-10-14", normalized_summary: "Great for home. Perfect size for family of 4. Non-stick works even without oil." }),
  mkReview({ id: "r_b_026", marketplace: "flipkart_in", market: "IN", language: "hi", rating: 3, title: "Theek hai", body: "Pan theek hai lekin expected se thoda halka hai.", date: "2024-10-16", normalized_summary: "It's okay but lighter than expected." }),
  mkReview({ id: "r_b_027", marketplace: "amazon_in", market: "IN", language: "hi", rating: 5, title: "बढ़िया क्वालिटी", body: " buildup बहुत अच्छा है। Handle bhi strong lagta hai. 2 mahine ho gaye, koi problem nahi.", date: "2024-10-18", normalized_summary: "Excellent quality. Build is very good. Handle feels strong. 2 months, no problem." }),
  mkReview({ id: "r_b_028", marketplace: "flipkart_in", market: "IN", language: "hi", rating: 4, title: "अच्छा पैन", body: "Eggs aur pancakes banane mein best hai. Clean up 30 second mein ho jata hai.", date: "2024-10-20", normalized_summary: "Good pan. Best for eggs and pancakes. Clean up in 30 seconds." }),
  mkReview({ id: "r_b_029", marketplace: "amazon_in", market: "IN", language: "hi", rating: 5, title: "Value for money", body: "Price ke hisaab se best pan hai market mein. Delivery bhi fast thi.", date: "2024-10-22", normalized_summary: "Value for money. Best pan at this price. Fast delivery too." }),
  mkReview({ id: "r_b_030", marketplace: "flipkart_in", market: "IN", language: "hi", rating: 4, title: "सही प्रोडक्ट", body: "Tower ka naam suna tha, ab khud use kar raha hoon. Satisfied hoon.", date: "2024-10-24", normalized_summary: "Right product. Heard of Tower, now using myself. Satisfied." }),

  // Positive baseline (Arabic)
  mkReview({ id: "r_b_031", marketplace: "noon_uae", market: "UAE", language: "ar", rating: 5, title: "ممتاز", body: "جودة ممتازة والسطح غير لاصق يعمل بشكل رائع. أنصح به بشدة.", date: "2024-10-05", normalized_summary: "Excellent quality and the non-stick surface works great. Highly recommended." }),
  mkReview({ id: "r_b_032", marketplace: "noon_ksa", market: "KSA", language: "ar", rating: 4, title: "جيد جداً", body: "مقاس ممتاز للعائلة. التنظيف سهل والتسخين متساوي.", date: "2024-10-08", normalized_summary: "Very good. Excellent family size. Easy to clean and even heating." }),
  mkReview({ id: "r_b_033", marketplace: "noon_uae", market: "UAE", language: "ar", rating: 5, title: "أفضل مقلاة", body: "استخدمها يومياً منذ شهرين ولازالت كالجديدة. جودة عالية.", date: "2024-10-10", normalized_summary: "Best frying pan. Using daily for 2 months, still like new. High quality." }),
  mkReview({ id: "r_b_034", marketplace: "noon_ksa", market: "KSA", language: "ar", rating: 4, title: "راضٍ عن الشراء", body: "السعر مناسب والجودة جيدة. التوصيل كان سريعاً.", date: "2024-10-12", normalized_summary: "Satisfied with purchase. Good price and quality. Fast delivery." }),
  mkReview({ id: "r_b_035", marketplace: "noon_uae", market: "UAE", language: "ar", rating: 5, title: "جودة ممتازة", body: "لا يلتصق الطعام أبداً. سهل الغسل ومريح في الاستخدام.", date: "2024-10-14", normalized_summary: "Excellent quality. Food never sticks. Easy to wash and comfortable to use." }),
  mkReview({ id: "r_b_036", marketplace: "noon_ksa", market: "KSA", language: "ar", rating: 4, title: "منتج جيد", body: "المقبض مريح وثابت. التغليف كان جيداً.", date: "2024-10-16", normalized_summary: "Good product. Handle is comfortable and stable. Packaging was good." }),
  mkReview({ id: "r_b_037", marketplace: "noon_uae", market: "UAE", language: "ar", rating: 5, title: "ممتازة جداً", body: "أفضل من الماركات المحلية. السعر مقابل الجودة ممتاز.", date: "2024-10-18", normalized_summary: "Very excellent. Better than local brands. Excellent price for quality." }),
  mkReview({ id: "r_b_038", marketplace: "noon_ksa", market: "KSA", language: "ar", rating: 3, title: "جيدة", body: "مقبول لكن كان أتوقع جودة أعلى قليلاً.", date: "2024-10-20", normalized_summary: "Good. Acceptable but expected slightly higher quality." }),
  mkReview({ id: "r_b_039", marketplace: "noon_uae", market: "UAE", language: "ar", rating: 5, title: "أنصح به", body: "جودة التصنيع عالية. المقبض ثابت والسطح متين.", date: "2024-10-22", normalized_summary: "Recommended. High manufacturing quality. Handle is stable and surface is durable." }),
  mkReview({ id: "r_b_040", marketplace: "noon_ksa", market: "KSA", language: "ar", rating: 4, title: "جيد", body: "استخدام ممتاز. أسرتي راضية عنه.", date: "2024-10-24", normalized_summary: "Good. Excellent usage. My family is satisfied with it." }),

  // Positive baseline (Bahasa Indonesia — future-ready)
  mkReview({ id: "r_b_041", marketplace: "amazon_in", market: "IN", language: "id", rating: 5, title: "Bagus sekali", body: "Anti lengketnya bekerja dengan baik. Mudah dibersihkan. Harga sesuai.", date: "2024-10-10", normalized_summary: "Very good. Non-stick works well. Easy to clean. Price is right." }),
  mkReview({ id: "r_b_042", marketplace: "noon_uae", market: "UAE", language: "id", rating: 4, title: "Produk bagus", body: "Kualitas bagus. Pengiriman cepat. Saya puas.", date: "2024-10-15", normalized_summary: "Good product. Quality is good. Fast delivery. I'm satisfied." }),

  // Negative baseline — NON-handle issues (to keep handle at ~2%)
  mkReview({ id: "r_b_043", marketplace: "amazon_in", market: "IN", language: "en", rating: 2, title: "Coating peeling after 2 weeks", body: "Disappointed. The coating is already coming off. Not what I expected from Tower.", date: "2024-10-06", theme_ids: ["theme_coating_peeling"] }),
  mkReview({ id: "r_b_044", marketplace: "flipkart_in", market: "IN", language: "en", rating: 2, title: "Wrong size delivered", body: "Ordered 24cm but received 20cm. Return process was painful.", date: "2024-10-09", theme_ids: ["theme_wrong_item", "theme_warranty_support"] }),
  mkReview({ id: "r_b_045", marketplace: "noon_uae", market: "UAE", language: "en", rating: 1, title: "Arrived damaged", body: "Box was torn and pan had scratches. Marketplace should do better with packaging.", date: "2024-10-11", theme_ids: ["theme_packaging_damage"] }),
  mkReview({ id: "r_b_046", marketplace: "amazon_in", market: "IN", language: "hi", rating: 2, title: "कोटिंग निकल रही है", body: "2 हफ्ते में coating peel hone lagi. Tower se yeh expectation nahi thi.", date: "2024-10-13", normalized_summary: "Coating peeling after 2 weeks. Didn't expect this from Tower.", theme_ids: ["theme_coating_peeling"] }),
  mkReview({ id: "r_b_047", marketplace: "noon_ksa", market: "KSA", language: "ar", rating: 2, title: "التغليف سيء", body: "الصندوق كان ممزقاً والمقلاة بها خدوش. التغليف يحتاج تحسين.", date: "2024-10-15", normalized_summary: "Packaging was bad. Box was torn and pan had scratches. Needs improvement." }),
  mkReview({ id: "r_b_048", marketplace: "flipkart_in", market: "IN", language: "en", rating: 3, title: "Delivery was late", body: "Product is fine but arrived 4 days late. Needed it for a gift.", date: "2024-10-17", theme_ids: ["theme_late_delivery"] }),
  mkReview({ id: "r_b_049", marketplace: "amazon_in", market: "IN", language: "en", rating: 2, title: "Support not helpful", body: "Had a warranty question. Support took 5 days to reply with a generic answer.", date: "2024-10-19", theme_ids: ["theme_warranty_support"] }),
  mkReview({ id: "r_b_050", marketplace: "noon_uae", market: "UAE", language: "en", rating: 2, title: "Smaller than expected", body: "Looks bigger in photos. Check the dimensions carefully before buying.", date: "2024-10-21", theme_ids: ["theme_size_mismatch"] }),
  mkReview({ id: "r_b_051", marketplace: "flipkart_in", market: "IN", language: "hi", rating: 1, title: "गलत प्रोडक्ट भेजा", body: "24cm order kiya tha, 20cm aaya. Return mein bahut problem hui.", date: "2024-10-23", normalized_summary: "Wrong product sent. Ordered 24cm, got 20cm. Lots of problems with return.", theme_ids: ["theme_wrong_item", "theme_warranty_support"] }),
  mkReview({ id: "r_b_052", marketplace: "noon_ksa", market: "KSA", language: "ar", rating: 2, title: "تأخر التوصيل", body: "وصل المنتج بعد أسبوع من الموعد المحدد. لم أعد بحاجة له.", date: "2024-10-25", normalized_summary: "Delivery was delayed by a week from scheduled date. No longer needed it." }),
  mkReview({ id: "r_b_053", marketplace: "amazon_in", market: "IN", language: "en", rating: 2, title: "Coating scratched easily", body: "Used wooden spatula only but coating has visible scratches after a month.", date: "2024-10-27", theme_ids: ["theme_coating_peeling"] }),
  mkReview({ id: "r_b_054", marketplace: "flipkart_in", market: "IN", language: "en", rating: 3, title: "Average quality", body: "Not as premium as described. Pan feels lightweight and flimsy.", date: "2024-10-29", theme_ids: ["theme_size_mismatch"] }),
  mkReview({ id: "r_b_055", marketplace: "noon_uae", market: "UAE", language: "en", rating: 2, title: "Support ignored my request", body: "Emailed about a coating issue. No reply in 2 weeks.", date: "2024-10-30", theme_ids: ["theme_warranty_support"] }),

  // BASELINE — The 2 handle-breakage reviews (~2% of ~55 reviews so far, need more to get to ~100 total)
  mkReview({ id: "r_b_056", marketplace: "noon_uae", market: "UAE", language: "en", rating: 1, title: "Handle broke on first use", body: "Was cooking dinner and the handle completely snapped off. Very dangerous. Could have caused burns.", date: "2024-10-20", theme_ids: ["theme_handle_breakage"], sentiment: "negative" }),
  mkReview({ id: "r_b_057", marketplace: "flipkart_in", market: "IN", language: "hi", rating: 2, title: "हैंडल थोड़ा लूज है", body: "Pan achha hai lekin handle loose lag raha hai. Dar hai ki kuch din mein toot jaye.", date: "2024-10-25", normalized_summary: "Pan is good but handle feels loose. Worried it might break in a few days.", theme_ids: ["theme_handle_breakage"], sentiment: "negative" }),

  // Fillers to reach ~100 baseline reviews (neutral/positive to dilute)
  mkReview({ id: "r_b_058", marketplace: "amazon_in", market: "IN", language: "en", rating: 4, title: "Solid pan", body: "No complaints. Does the job well.", date: "2024-10-01" }),
  mkReview({ id: "r_b_059", marketplace: "amazon_in", market: "IN", language: "en", rating: 5, title: "Excellent", body: "Love it. Use it every morning.", date: "2024-10-02" }),
  mkReview({ id: "r_b_060", marketplace: "flipkart_in", market: "IN", language: "en", rating: 4, title: "Good", body: "Value for money product.", date: "2024-10-03" }),
  mkReview({ id: "r_b_061", marketplace: "noon_uae", market: "UAE", language: "en", rating: 5, title: "Amazing", body: "Non-stick is incredible. No oil needed.", date: "2024-10-04" }),
  mkReview({ id: "r_b_062", marketplace: "noon_ksa", market: "KSA", language: "en", rating: 4, title: "Very nice", body: "Happy customer. Will buy more.", date: "2024-10-05" }),
  mkReview({ id: "r_b_063", marketplace: "amazon_in", market: "IN", language: "en", rating: 5, title: "Perfect", body: "Best purchase this month.", date: "2024-10-06" }),
  mkReview({ id: "r_b_064", marketplace: "flipkart_in", market: "IN", language: "en", rating: 4, title: "Nice one", body: "Tower quality is consistent.", date: "2024-10-07" }),
  mkReview({ id: "r_b_065", marketplace: "noon_uae", market: "UAE", language: "en", rating: 5, title: "Top quality", body: "Could not be happier.", date: "2024-10-08" }),
  mkReview({ id: "r_b_066", marketplace: "noon_ksa", market: "KSA", language: "en", rating: 4, title: "Great buy", body: "Pan heats evenly across surface.", date: "2024-10-09" }),
  mkReview({ id: "r_b_067", marketplace: "amazon_in", market: "IN", language: "en", rating: 5, title: "Love the design", body: "Looks modern and works great.", date: "2024-10-10" }),
  mkReview({ id: "r_b_068", marketplace: "flipkart_in", market: "IN", language: "en", rating: 4, title: "Good value", body: "Cheaper alternatives don't compare.", date: "2024-10-11" }),
  mkReview({ id: "r_b_069", marketplace: "noon_uae", market: "UAE", language: "en", rating: 5, title: "Brilliant", body: "Eggs, pancakes, stir fry — all perfect.", date: "2024-10-12" }),
  mkReview({ id: "r_b_070", marketplace: "noon_ksa", market: "KSA", language: "en", rating: 5, title: "Fantastic quality", body: "Premium feel at mid-range price.", date: "2024-10-13" }),
  mkReview({ id: "r_b_071", marketplace: "amazon_in", market: "IN", language: "hi", rating: 5, title: "बढ़िया", body: "Bahut achha pan hai. Non-stick best hai.", date: "2024-10-14", normalized_summary: "Excellent. Very good pan. Non-stick is best." }),
  mkReview({ id: "r_b_072", marketplace: "flipkart_in", market: "IN", language: "hi", rating: 4, title: "अच्छा", body: "Sahi price pe mila. Quality bhi theek hai.", date: "2024-10-15", normalized_summary: "Good. Got at right price. Quality is also okay." }),
  mkReview({ id: "r_b_073", marketplace: "amazon_in", market: "IN", language: "hi", rating: 5, title: "Best pan", body: "Ghar mein sabko pasand aaya. Cleaning bhi asaan.", date: "2024-10-16", normalized_summary: "Best pan. Everyone at home likes it. Cleaning is also easy." }),
  mkReview({ id: "r_b_074", marketplace: "flipkart_in", market: "IN", language: "hi", rating: 4, title: "सही है", body: "Tower ka pan reliable hai. Pehla nahi hai mera.", date: "2024-10-17", normalized_summary: "It's right. Tower pan is reliable. Not my first one." }),
  mkReview({ id: "r_b_075", marketplace: "noon_uae", market: "UAE", language: "ar", rating: 5, title: "رائع", body: "جودة ممتازة ومقبض ثابت. سعيد بالشراء.", date: "2024-10-18", normalized_summary: "Great. Excellent quality and stable handle. Happy with purchase." }),
  mkReview({ id: "r_b_076", marketplace: "noon_ksa", market: "KSA", language: "ar", rating: 4, title: "ممتاز", body: "يعمل بشكل رائع. لا يلتصق الطعام.", date: "2024-10-19", normalized_summary: "Excellent. Works great. Food doesn't stick." }),
  mkReview({ id: "r_b_077", marketplace: "noon_uae", market: "UAE", language: "ar", rating: 5, title: "جودة عالية", body: "تصنيع ممتاز. المقبض مريح والوزن مناسب.", date: "2024-10-20", normalized_summary: "High quality. Excellent manufacturing. Handle is comfortable and weight is suitable." }),
  mkReview({ id: "r_b_078", marketplace: "noon_ksa", market: "KSA", language: "ar", rating: 4, title: "منتج رائع", body: "أنصح به لكل عائلة.", date: "2024-10-21", normalized_summary: "Great product. Recommend it for every family." }),
  mkReview({ id: "r_b_079", marketplace: "amazon_in", market: "IN", language: "en", rating: 4, title: "Good pan", body: "Heats up quickly. Cleans well.", date: "2024-10-22" }),
  mkReview({ id: "r_b_080", marketplace: "flipkart_in", market: "IN", language: "en", rating: 5, title: "Perfect size", body: "For a small family this is ideal.", date: "2024-10-23" }),
  mkReview({ id: "r_b_081", marketplace: "noon_uae", market: "UAE", language: "en", rating: 4, title: "Nice quality", body: "Handle stays cool during cooking.", date: "2024-10-24" }),
  mkReview({ id: "r_b_082", marketplace: "noon_ksa", market: "KSA", language: "en", rating: 5, title: "Excellent purchase", body: "Would recommend to friends.", date: "2024-10-25" }),
  mkReview({ id: "r_b_083", marketplace: "amazon_in", market: "IN", language: "en", rating: 4, title: "Decent pan", body: "No issues so far after 1 month.", date: "2024-10-26" }),
  mkReview({ id: "r_b_084", marketplace: "flipkart_in", market: "IN", language: "en", rating: 5, title: "Tower fan", body: "Have 5 Tower products now. All great.", date: "2024-10-27" }),
  mkReview({ id: "r_b_085", marketplace: "noon_uae", market: "UAE", language: "en", rating: 4, title: "Good value", body: "Competes with more expensive brands.", date: "2024-10-28" }),
  mkReview({ id: "r_b_086", marketplace: "noon_ksa", market: "KSA", language: "en", rating: 5, title: "Love cooking now", body: "This pan makes cooking enjoyable.", date: "2024-10-29" }),
  mkReview({ id: "r_b_087", marketplace: "amazon_in", market: "IN", language: "hi", rating: 5, title: "घरेलू असली", body: "Ghar par sabji banane ke liye badhiya hai.", date: "2024-10-30", normalized_summary: "Authentic home-style. Great for cooking vegetables at home." }),
  mkReview({ id: "r_b_088", marketplace: "flipkart_in", market: "IN", language: "hi", rating: 4, title: "काम का", body: "Roz use karta hoon. Koi problem nahi.", date: "2024-10-31", normalized_summary: "Useful. Use daily. No problem." }),
  mkReview({ id: "r_b_089", marketplace: "noon_uae", market: "UAE", language: "ar", rating: 5, title: "ممتاز جداً", body: "لا يوجد ما أضيفه. منتج ممتاز.", date: "2024-10-01", normalized_summary: "Very excellent. Nothing to add. Excellent product." }),
  mkReview({ id: "r_b_090", marketplace: "noon_ksa", market: "KSA", language: "ar", rating: 4, title: "جيد", body: "الجودة مناسبة للسعر. سعيد بالشراء.", date: "2024-10-02", normalized_summary: "Good. Quality suitable for price. Happy with purchase." }),
  mkReview({ id: "r_b_091", marketplace: "amazon_in", market: "IN", language: "en", rating: 3, title: "Okay", body: "Average. Nothing special but works.", date: "2024-10-03" }),
  mkReview({ id: "r_b_092", marketplace: "flipkart_in", market: "IN", language: "en", rating: 4, title: "Works", body: "Does what it needs to do.", date: "2024-10-04" }),
  mkReview({ id: "r_b_093", marketplace: "noon_uae", market: "UAE", language: "en", rating: 5, title: "Superb", body: "Better than expected honestly.", date: "2024-10-05" }),
  mkReview({ id: "r_b_094", marketplace: "noon_ksa", market: "KSA", language: "en", rating: 4, title: "Reliable", body: "Consistent performance every time.", date: "2024-10-06" }),
  mkReview({ id: "r_b_095", marketplace: "amazon_in", market: "IN", language: "en", rating: 5, title: "Must buy", body: "Don't think, just buy it.", date: "2024-10-07" }),
  mkReview({ id: "r_b_096", marketplace: "flipkart_in", market: "IN", language: "en", rating: 4, title: "Quality", body: "Tower delivers again.", date: "2024-10-08" }),
  mkReview({ id: "r_b_097", marketplace: "noon_uae", market: "UAE", language: "en", rating: 5, title: "Awesome", body: "Perfect for daily cooking.", date: "2024-10-09" }),
  mkReview({ id: "r_b_098", marketplace: "noon_ksa", market: "KSA", language: "en", rating: 4, title: "Happy", body: "No regrets with this purchase.", date: "2024-10-10" }),
  mkReview({ id: "r_b_099", marketplace: "amazon_in", market: "IN", language: "en", rating: 4, title: "Fine", body: "Above average quality.", date: "2024-10-11" }),
  mkReview({ id: "r_b_100", marketplace: "flipkart_in", market: "IN", language: "en", rating: 5, title: "Best", body: "My favorite pan now.", date: "2024-10-12" }),
];

// ========================
// CURRENT PERIOD (~this week + recent)
// ~50 reviews, handle breakage ~12%
// Concentrated on Noon UAE and Amazon India
// ========================
export const currentReviews: Review[] = [
  // Positive current
  mkReview({ id: "r_c_001", marketplace: "amazon_in", market: "IN", language: "en", rating: 5, title: "Still loving it", body: "Been using for 3 months now. No issues at all.", date: "2024-11-01" }),
  mkReview({ id: "r_c_002", marketplace: "flipkart_in", market: "IN", language: "en", rating: 4, title: "Good as before", body: "Second Tower pan. Same consistent quality.", date: "2024-11-02" }),
  mkReview({ id: "r_c_003", marketplace: "noon_uae", market: "UAE", language: "en", rating: 5, title: "Daily driver", body: "Use it twice a day. Holding up well.", date: "2024-11-03" }),
  mkReview({ id: "r_c_004", marketplace: "noon_ksa", market: "KSA", language: "en", rating: 4, title: "Reliable", body: "No complaints after 6 weeks.", date: "2024-11-04" }),
  mkReview({ id: "r_c_005", marketplace: "amazon_in", market: "IN", language: "hi", rating: 5, title: "अब भी बढ़िया", body: "3 mahine ho gaye, abhi bhi best hai.", date: "2024-11-01", normalized_summary: "Still excellent. 3 months in, still the best." }),
  mkReview({ id: "r_c_006", marketplace: "flipkart_in", market: "IN", language: "hi", rating: 4, title: "सही चल रहा", body: "Roz use kar raha hoon. Koi complaint nahi.", date: "2024-11-02", normalized_summary: "Running fine. Using daily. No complaint." }),
  mkReview({ id: "r_c_007", marketplace: "noon_uae", market: "UAE", language: "ar", rating: 5, title: "ما زالت ممتازة", body: "استخدمها يومياً منذ شهرين. لا يوجد أي مشكلة.", date: "2024-11-03", normalized_summary: "Still excellent. Using daily for 2 months. No issues at all." }),
  mkReview({ id: "r_c_008", marketplace: "noon_ksa", market: "KSA", language: "ar", rating: 4, title: "موثوقة", body: "جودة ثابتة. سعيد بها.", date: "2024-11-04", normalized_summary: "Reliable. Consistent quality. Happy with it." }),
  mkReview({ id: "r_c_009", marketplace: "amazon_in", market: "IN", language: "en", rating: 4, title: "Recommended", body: "Good build and finish. No problems.", date: "2024-11-05" }),
  mkReview({ id: "r_c_010", marketplace: "flipkart_in", market: "IN", language: "en", rating: 5, title: "Happy customer", body: "Wife loves it. Easy for her to use.", date: "2024-11-06" }),
  mkReview({ id: "r_c_011", marketplace: "noon_uae", market: "UAE", language: "en", rating: 4, title: "Quality maintained", body: "Same brand, same quality. Good purchase.", date: "2024-11-07" }),
  mkReview({ id: "r_c_012", marketplace: "noon_ksa", market: "KSA", language: "en", rating: 5, title: "Great non-stick", body: "Nothing sticks. Cleaning takes 10 seconds.", date: "2024-11-01" }),
  mkReview({ id: "r_c_013", marketplace: "amazon_in", market: "IN", language: "en", rating: 3, title: "Okay", body: "Not as good as hoped. Heats a bit unevenly.", date: "2024-11-02" }),
  mkReview({ id: "r_c_014", marketplace: "flipkart_in", market: "IN", language: "en", rating: 4, title: "Nice", body: "Works well for the price.", date: "2024-11-03" }),
  mkReview({ id: "r_c_015", marketplace: "noon_uae", market: "UAE", language: "en", rating: 5, title: "Love", body: "Best pan in my kitchen.", date: "2024-11-04" }),
  mkReview({ id: "r_c_016", marketplace: "noon_ksa", market: "KSA", language: "en", rating: 4, title: "Good", body: "Solid build. Trustworthy brand.", date: "2024-11-05" }),
  mkReview({ id: "r_c_017", marketplace: "amazon_in", market: "IN", language: "hi", rating: 5, title: "घर का स्टार", body: "Ghar mein sabse zyada use hone wala pan.", date: "2024-11-06", normalized_summary: "Star of the home. Most used pan in the house." }),
  mkReview({ id: "r_c_018", marketplace: "flipkart_in", market: "IN", language: "hi", rating: 4, title: "ठीक ठाक", body: "Pehle se better hai. Price ke hisaab se achha.", date: "2024-11-07", normalized_summary: "Okay. Better than before. Good for the price." }),
  mkReview({ id: "r_c_019", marketplace: "noon_uae", market: "UAE", language: "ar", rating: 5, title: "رائعة", body: "جودة ممتازة. أنصح بها بشدة.", date: "2024-11-01", normalized_summary: "Great. Excellent quality. Highly recommended." }),
  mkReview({ id: "r_c_020", marketplace: "noon_ksa", market: "KSA", language: "ar", rating: 4, title: "ممتاز", body: "ثقيلة ومريحة. التنظيف سهل.", date: "2024-11-02", normalized_summary: "Excellent. Heavy and comfortable. Easy to clean." }),

  // Non-handle negative current
  mkReview({ id: "r_c_021", marketplace: "flipkart_in", market: "IN", language: "en", rating: 2, title: "Coating gone in 10 days", body: "Very disappointed. Coating started peeling after just 10 days of light use.", date: "2024-11-01", theme_ids: ["theme_coating_peeling"] }),
  mkReview({ id: "r_c_022", marketplace: "noon_ksa", market: "KSA", language: "en", rating: 1, title: "Arrived scratched", body: "Pan had deep scratches out of the box. Packaging was inadequate.", date: "2024-11-02", theme_ids: ["theme_packaging_damage"] }),
  mkReview({ id: "r_c_023", marketplace: "amazon_in", market: "IN", language: "hi", rating: 2, title: "कोटिंग निकल गई", body: "10 din mein coating peel hone lagi. Bahut disappointing.", date: "2024-11-03", normalized_summary: "Coating peeled in 10 days. Very disappointing.", theme_ids: ["theme_coating_peeling"] }),
  mkReview({ id: "r_c_024", marketplace: "noon_uae", market: "UAE", language: "en", rating: 2, title: "Not as described", body: "Color and finish differ from photos. Feeling misled.", date: "2024-11-04", theme_ids: ["theme_size_mismatch"] }),
  mkReview({ id: "r_c_025", marketplace: "flipkart_in", market: "IN", language: "en", rating: 2, title: "Support useless", body: "Sent 3 emails about a warranty question. Got auto-replies only.", date: "2024-11-05", theme_ids: ["theme_warranty_support"] }),
  mkReview({ id: "r_c_026", marketplace: "noon_ksa", market: "KSA", language: "ar", rating: 2, title: "التغليف سيء", body: "الصندوق مفتوح والمقلاة بها خدوش عميقة.", date: "2024-11-06", normalized_summary: "Bad packaging. Box was open and pan had deep scratches.", theme_ids: ["theme_packaging_damage"] }),
  mkReview({ id: "r_c_027", marketplace: "amazon_in", market: "IN", language: "en", rating: 2, title: "Smaller than shown", body: "Product looks much smaller in reality. Misleading images.", date: "2024-11-07", theme_ids: ["theme_size_mismatch"] }),
  mkReview({ id: "r_c_036", marketplace: "flipkart_in", market: "IN", language: "en", rating: 3, title: "Average this time", body: "Not as good as my previous Tower pan. Something feels off with the build.", date: "2024-11-05" }),
  mkReview({ id: "r_c_037", marketplace: "noon_ksa", market: "KSA", language: "en", rating: 4, title: "Pretty good", body: "Happy overall. No complaints.", date: "2024-11-06" }),

  // THE SPIKE: Handle breakage (~12% = 4 out of ~34 reviews)
  // Concentrated on Noon UAE and Amazon India per PRD
  mkReview({ id: "r_c_032", marketplace: "noon_uae", market: "UAE", language: "en", rating: 1, title: "Handle broke while frying", body: "I was frying fish and the handle completely detached from the pan. Hot oil spilled. This is a safety hazard. Tower needs to recall this batch.", date: "2024-11-01", theme_ids: ["theme_handle_breakage"], sentiment: "negative" }),
  mkReview({ id: "r_c_033", marketplace: "amazon_in", market: "IN", language: "en", rating: 1, title: "Handle snapped off", body: "The handle literally snapped off while I was tossing vegetables. It's a brand new pan. Very dangerous product.", date: "2024-11-02", theme_ids: ["theme_handle_breakage"], sentiment: "negative" }),
  mkReview({ id: "r_c_034", marketplace: "noon_uae", market: "UAE", language: "ar", rating: 1, title: "المقبض انكسر", body: "المقبض انفصل أثناء الطبخ. انسكب الزيت الساخن. هذا خطير جداً. يجب سحب الدفعة من السوق.", date: "2024-11-03", normalized_summary: "Handle broke during cooking. Hot oil spilled. Very dangerous. The batch should be recalled.", theme_ids: ["theme_handle_breakage"], sentiment: "negative" }),
  mkReview({ id: "r_c_035", marketplace: "amazon_in", market: "IN", language: "hi", rating: 2, title: "हैंडल टूट गया", body: "Sabzi pakate waqt handle toot gaya. Garam pan gir gaya. Haadsa ho sakta tha. Tower ko ispar action lena chahiye.", date: "2024-11-04", normalized_summary: "Handle broke while cooking vegetables. Hot pan fell. Could have been an accident. Tower should take action.", theme_ids: ["theme_handle_breakage"], sentiment: "negative" }),
];

export const allReviews: Review[] = [...baselineReviews, ...currentReviews];

export function getReviewsForProduct(productId: string): Review[] {
  return allReviews.filter((r) => r.product_id === productId);
}

export function findReviewById(id: string): Review | undefined {
  return allReviews.find((r) => r.id === id);
}
