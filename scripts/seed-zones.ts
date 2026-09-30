/**
 * Loads every town and village of Akkar (plus the Miniyeh side) as delivery zones, $4 each.
 *   npm run db:zones
 * Safe to run again: existing zones are matched by their English name and never duplicated or overwritten
 * (so prices/edits you made in the dashboard stay). Prices can be changed per zone under Delivery zones.
 * Source: the localities of Akkar District (Arabic Wikipedia) + Miniyeh–Danniyeh coast towns; spellings follow common Lebanese usage.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const FEE = 4;

// south -> north on the Miniyeh side first (Deir Ammar is already a zone), then Akkar A-Z
const MINIYEH_SIDE: [string, string][] = [
  ["Deir Nbouh", "دير نبوح"],
  ["Miniyeh", "المنية"],
  ["Bhannine", "بحنين"],
  ["Markabta", "مركبتا"],
];

const AKKAR: [string, string][] = [
  ["Aabboudiye", "العبودية"], ["Aadbel", "عدبل"], ["Aaiyat", "عيات"], ["Aamaret El Baykat", "عمار البيكات"], ["Aaouainat", "العوينات"],
  ["Ain El Zeit", "عين الزيت"], ["Ain Tanta", "عين تنتا"], ["Ain Yaaqoub", "عين يعقوب"], ["Akkar El Atika", "عكار العتيقة"], ["Akroum", "أكروم"],
  ["Al Abdeh", "العبدة"], ["Al Arida", "العريضة"], ["Al Basateen", "البساتين"], ["Al Dabbabiyeh", "الدبابية"], ["Al Ghazileh", "الغزيلة"],
  ["Al Hadd", "الهد"], ["Al Hakour", "الحاكور"], ["Al Hawshab", "الحوشب"], ["Al Houeich", "الحويش"], ["Al Jadideh", "الجديدة"],
  ["Al Kanisa", "الكنيسة"], ["Al Kawashra", "الكواشرة"], ["Al Majdal", "المجدل"], ["Al Masoudiyeh", "المسعودية"], ["Al Mbarakiyeh", "المباركية"],
  ["Al Mouhammara", "المحمرة"], ["Al Nfisseh", "النفيسة"], ["Al Oyoun", "العيون"], ["Al Qantara", "القنطرة"], ["Al Qarqaf", "القرقف"],
  ["Al Qashlaq", "القشلق"], ["Al Qorneh", "القرنة"], ["Al Rihaniyeh", "الريحانية"], ["Al Sahleh", "السهلة"], ["Al Sammaqiyeh", "السماقية"],
  ["Al Sandiyaneh", "السنديانة"], ["Al Souaisseh", "السويسة"], ["Al Talil", "التليل"], ["Al Zawarib", "الزواريب"], ["Amayer", "عمير"],
  ["Andaket", "عندقت"], ["Aydamoun", "عيدمون"], ["Baghdadi (Daoussa)", "الدوسة"], ["Barbara", "بربارة"], ["Bebnine", "ببنين"],
  ["Beino", "بينو"], ["Beit Ayoub", "بيت أيوب"], ["Beit El Hajj", "بيت الحاج"], ["Beit Ghattas", "بيت غطاس"], ["Beit Mellat", "بيت ملات"],
  ["Beit Younes", "بيت يونس"], ["Berkayel", "برقايل"], ["Bezbina", "بزبينا"], ["Blanet El Haisseh", "بلانة الحيصة"], ["Bqerzla", "بقرزلا"],
  ["Burj El Arab", "برج العرب"], ["Bzal", "بزال"], ["Chadra", "شدرا"], ["Chan", "شان"], ["Charbila", "شربيلا"],
  ["Cheikh Mohammad", "الشيخ محمد"], ["Cheikh Taba", "الشيخ طابا"], ["Cheikh Zennad", "الشيخ زناد"], ["Cheikhlar", "شخلار"], ["Dahr El Laissineh", "ضهر الليسينة"],
  ["Dahr Hadara", "ضهر حدارة"], ["Darine", "دارين"], ["Deir Dalloum", "دير دلوم"], ["Deir Jannine", "دير جنين"], ["Denbo", "دنبو"],
  ["Douair Adouiyeh", "دوير عدوية"], ["Dhouq El Habalsa", "ذوق الحبالصة"], ["Dhouq El Hosniyeh", "ذوق الحصنية"], ["El Dawra", "الدورة"], ["El Hoshab", "الحوشب"],
  ["Fneidek", "فنيدق"], ["Fridis", "فريديس"], ["Habchit", "حبشيت"], ["Halba", "حلبا"], ["Haneider", "حنيدر"],
  ["Harar", "حرار"], ["Hayzouq", "حيزوق"], ["Hikr El Dahri", "حكر الضاهري"], ["Hikr Cheikh Taba", "حكر الشيخ طابا"], ["Hitla", "هيتلا"],
  ["Ilat", "إيلات"], ["Jdeidet El Qaitaa", "جديدة القيطع"], ["Jebrayel", "جبرايل"], ["Kafr Harra", "كفر حرة"], ["Kafr Malki", "كفر ملكي"],
  ["Kafrnoun", "كفرنون"], ["Kafrton", "كفرتون"], ["Karm Asfour", "كرم عصفور"], ["Kharbet Char", "خربة شار"], ["Kharbet Daoud", "خربة داوود"],
  ["Kharbet El Jord", "خربة الجرد"], ["Kharbet El Jindi", "خريبة الجندي"], ["Kroum Arab", "كروم عرب"], ["Kousha", "كوشا"], ["Machta Hammoud", "مشتى حمود"],
  ["Machta Hassan", "مشتى حسن"], ["Majdla", "مجدلا"], ["Mamnaa", "ممنع"], ["Manjez", "منجز"], ["Mar Touma", "مارتوما"],
  ["Marah El Khokh", "مراح الخوخ"], ["Mazraat Baldeh", "مزرعة بلدة"], ["Mishha", "مشحة"], ["Mishmish", "مشمش"], ["Mounseh", "مونسة"],
  ["Mouniara", "منيارة"], ["Mqaible", "مقيبلة"], ["Muqaita", "المقيطع"], ["Qabaait", "قبعيت"], ["Qabboula", "قبولا"],
  ["Qarha", "قرحة"], ["Qaniya", "قنية"], ["Qbayat (Qoubaiyat)", "القبيات"], ["Qleiaat", "القليعات"], ["Qloud El Baqiyeh", "قلود الباقية"],
  ["Qoubbet Bshamra", "قبة بشمرا"], ["Rahbeh", "رحبة"], ["Ramah", "رماح"], ["Safinet El Qaitaa", "سفينة القيطع"], ["Safinet El Dreib", "سفينة الدريب"],
  ["Saidine", "سعدين"], ["Sirar", "سرار"], ["Sisouq", "سيسوق"], ["Tachea", "تاشع"], ["Takrit", "تكريت"],
  ["Tal Biba", "تل بيبة"], ["Talhabira", "تلحبيرة"], ["Talbira", "تلبيرة"], ["Tall Abbas El Gharbi", "تل عباس الغربي"], ["Tall Abbas El Sharqi", "تل عباس الشرقي"],
  ["Tall Meayan", "تل معيان"], ["Tallet Shtaha", "تلة وشطاحة"], ["Wadi El Hour", "وادي الحور"], ["Wadi Khaled", "وادي خالد"], ["Wadi El Jamous", "وادي الجاموس"],
  ["Al Shakdouf", "الشقدوف"], ["Al Shakdouf El Oulya", "الشقدوف العليا"], ["Al Burj", "البرج"], ["Al Bira", "البيرة"],
];

async function main() {
  const existing = await db.deliveryZone.findMany({ select: { nameEn: true } });
  const have = new Set(existing.map((z) => z.nameEn.toLowerCase()));
  const max = await db.deliveryZone.aggregate({ _max: { sortOrder: true } });
  let order = (max._max.sortOrder ?? 0) + 1;

  const all = [...MINIYEH_SIDE, ...AKKAR.slice().sort((a, b) => a[0].localeCompare(b[0]))];
  const seen = new Set<string>();
  const fresh = all.filter(([en]) => {
    const k = en.toLowerCase();
    if (have.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  await db.deliveryZone.createMany({ data: fresh.map(([nameEn, nameAr]) => ({ nameEn, nameAr, fee: FEE, active: true, sortOrder: order++ })) });
  console.log(`Added ${fresh.length} delivery zones (${all.length - fresh.length} already existed). Total now: ${await db.deliveryZone.count()}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
