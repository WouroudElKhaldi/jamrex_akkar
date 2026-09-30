// Registry of every editable piece of website text. The dashboard builds its
// "Website content" forms from this list and the storefront reads values with
// getSiteContent(). Defaults are used until staff save a value.

export type FieldType = "text" | "textarea" | "image" | "url" | "toggle";

export type ContentField = {
  key: string;
  type: FieldType;
  label: { en: string; ar: string };
  /** false = a single value shared by both languages (stored in `en`) */
  bilingual: boolean;
  def: { en: string; ar: string };
};

export type ContentGroup = {
  id: string;
  label: { en: string; ar: string };
  fields: ContentField[];
};

const f = (
  key: string,
  type: FieldType,
  labelEn: string,
  labelAr: string,
  en: string,
  ar = "",
  bilingual = true,
): ContentField => ({ key, type, label: { en: labelEn, ar: labelAr }, bilingual, def: { en, ar: bilingual ? ar : en } });

const same = (key: string, type: FieldType, labelEn: string, labelAr: string, v: string) =>
  f(key, type, labelEn, labelAr, v, v, false);

export const CONTENT_GROUPS: ContentGroup[] = [
  {
    id: "general",
    label: { en: "Brand & contact", ar: "العلامة ومعلومات التواصل" },
    fields: [
      f("brand.name", "text", "Store name", "اسم المتجر", "Jamrex Miniyeh", "جامركس المنية"),
      f("brand.tagline", "text", "Tagline", "الشعار النصي", "Detergents, car care, cosmetics & more", "منظفات، عناية بالسيارات، مستحضرات تجميل والمزيد"),
      same("announce.enabled", "toggle", "Show announcement bar", "إظهار شريط الإعلان", "1"),
      f("announce.text", "text", "Announcement text", "نص الإعلان", "Delivery across all of Akkar & Miniyeh — only $4", "توصيل إلى كل عكار والمنية — فقط 4$"),
      same("contact.phone", "text", "Phone", "الهاتف", "+96170596772"),
      same("contact.whatsapp", "text", "WhatsApp number (digits only)", "رقم واتساب (أرقام فقط)", "96170596772"),
      same("contact.email", "text", "Email", "البريد الإلكتروني", "info@jamrexminiyeh.com"),
      f("contact.address", "text", "Address", "العنوان", "Miniyeh, Mafraq, Shahrazad Hall", "المنية مفرق صالة شهرزاد"),
      f("contact.hours", "text", "Opening hours", "ساعات العمل", "Every day, 9:00 AM – 9:00 PM", "كل يوم، من 9:00 صباحًا حتى 9:00 مساءً"),
      same("contact.mapUrl", "url", "Google Maps link", "رابط خرائط غوغل", "https://www.google.com/maps?q=34.473053,35.923363"),
      same("contact.mapEmbed", "url", "Google Maps embed link", "رابط تضمين الخريطة", "https://maps.google.com/maps?q=34.473053,35.923363&z=16&output=embed"),
      same("social.instagram", "url", "Instagram", "انستغرام", "https://www.instagram.com/jamrexminiyeh/"),
      same("social.facebook", "url", "Facebook", "فيسبوك", "https://www.facebook.com/people/Jamrex-Miniyeh/61594234088354/"),
      same("social.tiktok", "url", "TikTok (optional)", "تيك توك (اختياري)", ""),
      same("brand.logo", "image", "Logo image (optional, replaces the text logo)", "صورة الشعار (اختياري)", ""),
      same("brand.logoDark", "image", "Logo for dark mode (white version)", "الشعار للوضع الداكن (النسخة البيضاء)", ""),
      same("brand.iso", "image", "ISO badge image", "صورة شارة ISO", ""),
    ],
  },
  {
    id: "hero",
    label: { en: "Home — hero", ar: "الرئيسية — الواجهة" },
    fields: [
      same("home.show.hero", "toggle", "Show hero", "إظهار الواجهة", "1"),
      f("hero.badge", "text", "Badge", "الشارة", "Trust the national industry", "ثقة بالصناعة الوطنية"),
      f("hero.title", "text", "Title", "العنوان", "Clean homes. Shiny cars. Delivered to your door.", "بيوت نظيفة. سيارات لامعة. حتى باب بيتك."),
      f("hero.subtitle", "textarea", "Subtitle", "النص الفرعي", "Jamrex cleaning, car care and cosmetics products from our Miniyeh branch, delivered across Akkar for just $4.", "منتجات جامركس للتنظيف والعناية بالسيارات ومستحضرات التجميل من فرع المنية، مع توصيل إلى كل عكار بـ 4$ فقط."),
      f("hero.cta1.text", "text", "Primary button text", "نص الزر الأول", "Shop now", "تسوّق الآن"),
      same("hero.cta1.link", "url", "Primary button link", "رابط الزر الأول", "/shop"),
      f("hero.cta2.text", "text", "Secondary button text", "نص الزر الثاني", "View offers", "شاهد العروض"),
      same("hero.cta2.link", "url", "Secondary button link", "رابط الزر الثاني", "/offers"),
      same("hero.image", "image", "Hero image (optional)", "صورة الواجهة (اختياري)", ""),
    ],
  },
  {
    id: "home",
    label: { en: "Home — sections", ar: "الرئيسية — الأقسام" },
    fields: [
      same("home.show.categories", "toggle", "Show categories", "إظهار الفئات", "1"),
      f("home.categories.title", "text", "Categories title", "عنوان الفئات", "Shop by category", "تسوّق حسب الفئة"),
      same("home.show.banners", "toggle", "Show promo banners", "إظهار البانرات", "1"),
      same("home.show.deals", "toggle", "Show hot deals", "إظهار العروض", "1"),
      f("home.deals.title", "text", "Hot deals title", "عنوان العروض", "Hot deals", "عروض ساخنة"),
      same("home.show.new", "toggle", "Show new arrivals", "إظهار الجديد", "1"),
      f("home.new.title", "text", "New arrivals title", "عنوان الجديد", "New arrivals", "وصل حديثًا"),
      same("home.show.stats", "toggle", "Show numbers strip", "إظهار شريط الأرقام", "1"),
      same("home.show.featured", "toggle", "Show featured products", "إظهار المنتجات المميزة", "1"),
      f("home.featured.title", "text", "Featured title", "عنوان المميز", "Customer favourites", "المفضّل لدى الزبائن"),
      same("home.show.why", "toggle", "Show 'why us' strip", "إظهار قسم لماذا نحن", "1"),
      f("home.why1.title", "text", "Reason 1 title", "الميزة 1 - العنوان", "Trusted quality", "جودة موثوقة"),
      f("home.why1.text", "text", "Reason 1 text", "الميزة 1 - النص", "Genuine Jamrex products, ISO certified.", "منتجات جامركس الأصلية، حاصلة على ISO."),
      f("home.why2.title", "text", "Reason 2 title", "الميزة 2 - العنوان", "Fast delivery", "توصيل سريع"),
      f("home.why2.text", "text", "Reason 2 text", "الميزة 2 - النص", "All Akkar & Miniyeh for a flat $4.", "إلى كل عكار والمنية برسم ثابت 4$."),
      f("home.why3.title", "text", "Reason 3 title", "الميزة 3 - العنوان", "Pay your way", "ادفع كما تحب"),
      f("home.why3.text", "text", "Reason 3 text", "الميزة 3 - النص", "Cash on delivery or Whish Pay.", "الدفع عند الاستلام أو عبر Whish Pay."),
      f("home.why4.title", "text", "Reason 4 title", "الميزة 4 - العنوان", "Local support", "دعم محلي"),
      f("home.why4.text", "text", "Reason 4 text", "الميزة 4 - النص", "Talk to our Miniyeh team on WhatsApp.", "تواصل مع فريقنا في المنية عبر واتساب."),
      same("home.show.testimonials", "toggle", "Show testimonials", "إظهار آراء الزبائن", "1"),
      f("home.testimonials.title", "text", "Testimonials title", "عنوان آراء الزبائن", "What customers say", "ماذا يقول زبائننا"),
      same("home.show.branch", "toggle", "Show branch / map", "إظهار الفرع والخريطة", "1"),
      f("home.branch.title", "text", "Branch title", "عنوان الفرع", "Visit our Miniyeh branch", "زوروا فرعنا في المنية"),
      f("home.branch.text", "textarea", "Branch text", "نص الفرع", "Come see the full range in store, or order online and we deliver.", "تعالوا وشاهدوا كل المنتجات في المحل، أو اطلبوا أونلاين ونحن نوصّل."),
    ],
  },
  {
    id: "home_media",
    label: { en: "Home — video, before/after, celebrities", ar: "الرئيسية — الفيديو، قبل/بعد، المشاهير" },
    fields: [
      same("home.show.video", "toggle", "Show the video section", "إظهار قسم الفيديو", "1"),
      f("home.video.badge", "text", "Video — small label", "الفيديو — العنوان الصغير", "Watch & see", "شاهد بنفسك"),
      f("home.video.title", "text", "Video — title", "الفيديو — العنوان", "See Jamrex in action", "شاهد جامركس أثناء العمل"),
      f("home.video.text", "textarea", "Video — text", "الفيديو — النص", "Watch how Jamrex products deal with real, everyday mess.", "شاهد كيف تتعامل منتجات جامركس مع الأوساخ اليومية الحقيقية."),
      same("home.video.url", "url", "Video link (YouTube)", "رابط الفيديو (يوتيوب)", "https://youtu.be/_DFFhWYitT4"),
      same("home.video.poster", "image", "Video cover photo", "صورة غلاف الفيديو", ""),
      f("home.video.cta.text", "text", "Video — button text", "الفيديو — نص الزر", "Shop Fabric Cleaner", "تسوّق منظف الأقمشة"),
      same("home.video.cta.link", "url", "Video — button link", "الفيديو — رابط الزر", "/product/fabric-cleaner"),

      same("home.show.ba", "toggle", "Show the before/after section", "إظهار قسم قبل/بعد", "1"),
      f("home.ba.title", "text", "Before/after — title", "قبل/بعد — العنوان", "Enough with products that don't work", "كفى منتجات لا تعطي نتيجة"),
      f("home.ba.text", "text", "Before/after — text", "قبل/بعد — النص", "Real results with Jamrex. Drag the slider to see the difference.", "نتائج حقيقية مع جامركس. اسحب الشريط لترى الفرق."),
      f("home.ba.1.title", "text", "Pair 1 — title", "المقارنة 1 — العنوان", "", ""),
      same("home.ba.1.before", "image", "Pair 1 — BEFORE photo", "المقارنة 1 — صورة قبل", ""),
      same("home.ba.1.after", "image", "Pair 1 — AFTER photo", "المقارنة 1 — صورة بعد", ""),
      same("home.ba.1.link", "url", "Pair 1 — product link (optional)", "المقارنة 1 — رابط المنتج (اختياري)", ""),
      f("home.ba.2.title", "text", "Pair 2 — title", "المقارنة 2 — العنوان", "", ""),
      same("home.ba.2.before", "image", "Pair 2 — BEFORE photo", "المقارنة 2 — صورة قبل", ""),
      same("home.ba.2.after", "image", "Pair 2 — AFTER photo", "المقارنة 2 — صورة بعد", ""),
      same("home.ba.2.link", "url", "Pair 2 — product link (optional)", "المقارنة 2 — رابط المنتج (اختياري)", ""),
      f("home.ba.3.title", "text", "Pair 3 — title", "المقارنة 3 — العنوان", "", ""),
      same("home.ba.3.before", "image", "Pair 3 — BEFORE photo", "المقارنة 3 — صورة قبل", ""),
      same("home.ba.3.after", "image", "Pair 3 — AFTER photo", "المقارنة 3 — صورة بعد", ""),
      same("home.ba.3.link", "url", "Pair 3 — product link (optional)", "المقارنة 3 — رابط المنتج (اختياري)", ""),
      f("home.ba.4.title", "text", "Pair 4 — title", "المقارنة 4 — العنوان", "", ""),
      same("home.ba.4.before", "image", "Pair 4 — BEFORE photo", "المقارنة 4 — صورة قبل", ""),
      same("home.ba.4.after", "image", "Pair 4 — AFTER photo", "المقارنة 4 — صورة بعد", ""),
      same("home.ba.4.link", "url", "Pair 4 — product link (optional)", "المقارنة 4 — رابط المنتج (اختياري)", ""),

      same("home.show.celebs", "toggle", "Show the celebrities section", "إظهار قسم المشاهير", "1"),
      f("home.celebs.title", "text", "Celebrities — title", "المشاهير — العنوان", "Trusted by top celebrities", "يثق بنا أشهر المشاهير"),
      f("home.celebs.text", "text", "Celebrities — text (optional)", "المشاهير — النص (اختياري)", "", ""),
      same("home.celebs.img1", "image", "Photo 1", "الصورة 1", ""),
      same("home.celebs.img2", "image", "Photo 2", "الصورة 2", ""),
      same("home.celebs.img3", "image", "Photo 3", "الصورة 3", ""),
      same("home.celebs.img4", "image", "Photo 4", "الصورة 4", ""),
      same("home.celebs.img5", "image", "Photo 5", "الصورة 5", ""),
      same("home.celebs.img6", "image", "Photo 6", "الصورة 6", ""),
      same("home.celebs.img7", "image", "Photo 7", "الصورة 7", ""),
      same("home.celebs.img8", "image", "Photo 8", "الصورة 8", ""),
      same("home.celebs.img9", "image", "Photo 9", "الصورة 9", ""),
      same("home.celebs.img10", "image", "Photo 10", "الصورة 10", ""),
      same("home.celebs.img11", "image", "Photo 11", "الصورة 11", ""),
      same("home.celebs.img12", "image", "Photo 12", "الصورة 12", ""),
      same("home.celebs.img13", "image", "Photo 13", "الصورة 13", ""),
      same("home.celebs.img14", "image", "Photo 14", "الصورة 14", ""),
      same("home.celebs.img15", "image", "Photo 15", "الصورة 15", ""),
      same("home.celebs.img16", "image", "Photo 16", "الصورة 16", ""),
    ],
  },
  {
    id: "footer",
    label: { en: "Footer", ar: "التذييل" },
    fields: [
      f("footer.about", "textarea", "About text", "نبذة", "Official Jamrex branch in Miniyeh, Akkar. Cleaning products, car care and cosmetics.", "فرع جامركس الرسمي في المنية، عكار. منتجات تنظيف، عناية بالسيارات ومستحضرات تجميل."),
      f("footer.copyright", "text", "Copyright line", "سطر حقوق النشر", "Jamrex Miniyeh. All rights reserved.", "جامركس المنية. جميع الحقوق محفوظة."),
    ],
  },
  {
    id: "checkout",
    label: { en: "Checkout & payments", ar: "الدفع والطلب" },
    fields: [
      same("payments.cod.enabled", "toggle", "Allow cash on delivery", "السماح بالدفع عند الاستلام", "1"),
      same("payments.whish.enabled", "toggle", "Allow Whish Pay", "السماح بالدفع عبر Whish", "1"),
      f("checkout.note", "textarea", "Note shown at checkout", "ملاحظة تظهر في صفحة الطلب", "We deliver across Akkar and Miniyeh. Our team will call you to confirm your order.", "نوصّل إلى كل عكار والمنية. سيتصل بك فريقنا لتأكيد الطلب."),
    ],
  },
  {
    id: "seo",
    label: { en: "SEO", ar: "محركات البحث" },
    fields: [
      f("seo.title", "text", "Site title", "عنوان الموقع", "Jamrex Miniyeh — cleaning & car care delivered in Akkar", "جامركس المنية — منتجات تنظيف وعناية بالسيارات مع توصيل في عكار"),
      f("seo.description", "textarea", "Site description", "وصف الموقع", "Order Jamrex detergents, car care, cosmetics and more online. Fast delivery across Akkar & Miniyeh. Cash on delivery or Whish.", "اطلب منظفات جامركس والعناية بالسيارات ومستحضرات التجميل أونلاين. توصيل سريع في عكار والمنية. الدفع عند الاستلام أو عبر Whish."),
    ],
  },
];

export const ALL_FIELDS: ContentField[] = CONTENT_GROUPS.flatMap((g) => g.fields);
export const FIELD_BY_KEY: Record<string, ContentField> = Object.fromEntries(ALL_FIELDS.map((x) => [x.key, x]));
