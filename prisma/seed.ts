/* Creates the owner account, the delivery zone, categories and the default policy pages.
   Safe to run more than once (it never overwrites existing data). */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const CATEGORIES: [string, string, string][] = [
  ["offers", "Offers", "العروض"],
  ["home-cleaning", "Home Cleaning", "تنظيف المنزل"],
  ["car-care", "Car Care", "العناية بالسيارات"],
  ["laundry", "Laundry", "الغسيل"],
  ["fabrics", "Fabrics", "الأقمشة"],
  ["dishwash", "Dishwash", "غسيل الصحون"],
  ["hand-soap", "Hand Soap", "صابون اليدين"],
  ["air-fresheners", "Air Fresheners", "معطرات الجو"],
  ["cosmetics", "Cosmetics", "مستحضرات التجميل"],
  ["shoes", "Shoes", "الأحذية"],
  ["accessories", "Accessories", "الإكسسوارات"],
  ["other", "Other", "أخرى"],
];

const PAGES = [
  {
    slug: "delivery",
    titleEn: "Delivery information",
    titleAr: "معلومات التوصيل",
    bodyEn: "## Where we deliver\nWe deliver to all of Akkar and Miniyeh.\n\n## Delivery fee\nA flat fee of $4 applies to every order for now.\n\n## How it works\n- Place your order online.\n- Our Miniyeh team calls you to confirm.\n- We deliver to your door. Pay in cash on delivery or online with Whish Pay.",
    bodyAr: "## أين نوصّل\nنوصّل إلى كل عكار والمنية.\n\n## رسوم التوصيل\nتُطبَّق رسوم ثابتة قدرها 4$ على كل طلب حاليًا.\n\n## كيف يتم الطلب\n- قدّم طلبك أونلاين.\n- يتصل بك فريقنا في المنية للتأكيد.\n- نوصّل إلى باب بيتك. الدفع نقدًا عند الاستلام أو أونلاين عبر Whish Pay.",
    sortOrder: 1,
  },
  {
    slug: "exchange-policy",
    titleEn: "Exchange & cancellation policy",
    titleAr: "سياسة الاستبدال والإلغاء",
    bodyEn: "## No refund: exchange only\nWe value your satisfaction. Please read our policy on cancellations, exchanges and damaged items.\n\n## Order cancellation\nOrders can be cancelled within 2 days as long as they have not been shipped. Contact us as soon as possible with your order details. Orders that are already processed or shipped cannot be cancelled.\n\n## Damaged or faulty items\n- Contact us within 48 hours of receiving the item.\n- Send clear photos of the damage or problem.\n- After inspection we will either repair and return the item, or send a replacement at no extra cost.\n- The item must be unused and in its original packaging.\n\n## Gift voucher option\nInstead of an exchange you may ask for a gift voucher equal to the purchase price. This needs management approval and is valid for a limited period.\n\n## Important\nWe do not offer cash refunds. We do not accept exchanges for used items, misuse damage, or returns without prior approval.",
    bodyAr: "## لا استرجاع نقدي: استبدال فقط\nنهتم برضاكم. يرجى قراءة سياستنا بخصوص الإلغاء والاستبدال والمنتجات التالفة.\n\n## إلغاء الطلب\nيمكن إلغاء الطلب خلال يومين ما دام لم يُشحن. تواصل معنا بأسرع وقت مع تفاصيل الطلب. لا يمكن إلغاء الطلبات التي تمت معالجتها أو شحنها.\n\n## المنتجات التالفة أو المعيبة\n- تواصل معنا خلال 48 ساعة من استلام المنتج.\n- أرسل صورًا واضحة للتلف أو المشكلة.\n- بعد الفحص سنقوم إما بإصلاح المنتج وإعادته أو إرسال بديل دون أي تكلفة إضافية.\n- يجب أن يكون المنتج غير مستعمل وفي عبوته الأصلية.\n\n## خيار قسيمة الهدية\nبدل الاستبدال يمكنك طلب قسيمة هدية بقيمة سعر الشراء. يتطلب ذلك موافقة الإدارة وهي صالحة لفترة محدودة.\n\n## هام\nلا نقدّم استرجاعًا نقديًا. لا نقبل استبدال المنتجات المستعملة أو التالفة بسبب سوء الاستخدام أو المرتجعات دون موافقة مسبقة.",
    sortOrder: 2,
  },
  {
    slug: "privacy-policy",
    titleEn: "Privacy policy",
    titleAr: "سياسة الخصوصية",
    bodyEn: "## What we collect\nWhen you order or contact us we collect your name, email, phone number and delivery address. We also collect basic technical information such as browser type and pages visited.\n\n## How we use it\n- To process and deliver your orders.\n- To answer your questions.\n- To improve the website and keep it secure.\n\n## Sharing\nWe never sell your data. We share it only with service providers needed to run the shop (for example payment and hosting) or when required by law.\n\n## Security\nWe take reasonable steps to protect your information, but no online system is 100% secure.\n\n## Your rights\nYou can ask us to access, correct or delete your personal data by contacting us.\n\n## Contact\nUse the contact page or call us on the number shown in the footer.",
    bodyAr: "## ما الذي نجمعه\nعند الطلب أو التواصل معنا نجمع اسمك وبريدك الإلكتروني ورقم هاتفك وعنوان التوصيل. كما نجمع معلومات تقنية أساسية مثل نوع المتصفح والصفحات التي تزورها.\n\n## كيف نستخدمها\n- لمعالجة طلباتك وتوصيلها.\n- للإجابة عن أسئلتك.\n- لتحسين الموقع والحفاظ على أمانه.\n\n## المشاركة\nلا نبيع بياناتك أبدًا. نشاركها فقط مع مزوّدي الخدمات اللازمين لتشغيل المتجر (مثل الدفع والاستضافة) أو عندما يقتضي القانون ذلك.\n\n## الأمان\nنتخذ خطوات معقولة لحماية معلوماتك، لكن لا يوجد نظام إلكتروني آمن بنسبة 100%.\n\n## حقوقك\nيمكنك طلب الاطلاع على بياناتك الشخصية أو تصحيحها أو حذفها بالتواصل معنا.\n\n## التواصل\nاستخدم صفحة التواصل أو اتصل بنا على الرقم الظاهر في أسفل الموقع.",
    sortOrder: 3,
  },
];

async function main() {
  // owner
  const email = (process.env.OWNER_EMAIL || "owner@jamrexminiyeh.com").trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  const existingOwner = await db.user.findFirst({ where: { isOwner: true } });
  if (!existingOwner) {
    if (!password || password.length < 10) throw new Error("Set OWNER_PASSWORD (10+ characters) in .env before seeding");
    await db.user.create({ data: { email, name: process.env.OWNER_NAME || "Owner", passwordHash: await bcrypt.hash(password, 11), isOwner: true } });
    console.log(`✔ owner account created: ${email}`);
  } else console.log("• owner already exists, skipped");

  // delivery
  if ((await db.deliveryZone.count()) === 0) {
    await db.deliveryZone.createMany({ data: [
      { nameEn: "Akkar & Miniyeh", nameAr: "عكار والمنية", fee: 4, active: true, sortOrder: 0 },
      { nameEn: "Deir Amar", nameAr: "دير عمار", fee: 4, active: true, sortOrder: 1 },
    ] });
    console.log("✔ delivery zones created ($4 each)");
  }

  // categories
  for (const [i, [slug, nameEn, nameAr]] of CATEGORIES.entries()) {
    await db.category.upsert({ where: { slug }, update: {}, create: { slug, nameEn, nameAr, sortOrder: i, visible: slug !== "other" } });
  }
  console.log("✔ categories ready");

  // pages
  for (const p of PAGES) {
    await db.page.upsert({ where: { slug: p.slug }, update: {}, create: { ...p, published: true, inFooter: true } });
  }
  console.log("✔ default pages ready");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
