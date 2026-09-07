import type { projects } from '../db/schema.js';

type ProjectInsert = typeof projects.$inferInsert;
type TemplateCopy = Pick<
  ProjectInsert,
  | 'title'
  | 'titleEn'
  | 'titleCkb'
  | 'tagline'
  | 'taglineEn'
  | 'taglineCkb'
  | 'description'
  | 'descriptionEn'
  | 'descriptionCkb'
> & { demo: string; tags: string[] };

/** Fictional demonstrations, described by their working interface features. */
const TEMPLATES: TemplateCopy[] = [
  {
    demo: 'clinic-nawa',
    title: 'عيادة نواة — قالب موقع مركز طبي',
    titleEn: 'Nawa Clinic — Medical Centre Template',
    titleCkb: 'کلینیکی ناوا — تێمپلەیتی ناوەندی پزیشکی',
    tagline: 'هوية طبية هادئة، مجالات الرعاية، فريق توضيحي، وتجربة طلب موعد',
    taglineEn:
      'A calm clinic identity, areas of care, illustrative team profiles and a demo appointment flow',
    taglineCkb:
      'ناسنامەیەکی ئارام، بوارەکانی چاودێری، تیمێکی نموونەیی و تاقیکردنەوەی داواکردنی نۆرە',
    description:
      'قالب تجريبي بالعربية والإنجليزية لعيادة خيالية، بهوية بيضاء دافئة ولمسات خضراء. يعرض أربعة مجالات للرعاية، ملفات توضيحية للفريق، وخطوات الزيارة الأولى، مع أسئلة شائعة ونموذج لتجربة اختيار نوع الرعاية والوقت المفضل. تظهر رسالة تأكيد داخل الصفحة من دون إرسال البيانات أو حجز موعد فعلي. المحتوى والأسماء والصور للتوضيح، وليست سجلاً لعيادة حقيقية أو نتائج علاجية.',
    descriptionEn:
      'An Arabic and English demonstration for a fictional clinic, with a warm white and green identity. Four areas of care, illustrative team profiles and a first-visit guide lead into FAQs and an appointment-request form with care and time preferences. The form displays an on-page confirmation without transmitting details or booking a real appointment. Names, content and imagery illustrate the template; they do not represent a real clinic or treatment outcomes.',
    descriptionCkb:
      'تێمپلەیتێکی تاقیکردنەوە بە عەرەبی و ئینگلیزی بۆ کلینیکێکی خەیاڵی، بە ڕەنگی سپی گەرم و سەوز. چوار بواری چاودێری، ناساندنی تیمێکی نموونەیی، هەنگاوەکانی یەکەم سەردان و پرسیارە باوەکان پیشان دەدات. فۆڕمەکە ڕێگە بە هەڵبژاردنی جۆری چاودێری و کاتی پەسەندکراو دەدات و پەیامی پشتڕاستکردنەوە لە هەمان لاپەڕە پیشان دەدات؛ زانیاری نانێردرێت و نۆرەی ڕاستەقینە تۆمار ناکرێت. ناو و وێنە و ناوەڕۆکەکان بۆ ڕوونکردنەوەن، نەک بۆ ناساندنی کلینیکێکی ڕاستەقینە یان ئەنجامی چارەسەر.',
    tags: ['Next.js', 'Tailwind CSS', 'Motion', 'Forms', 'i18n', 'RTL'],
  },
  {
    demo: 'realestate-sukn',
    title: 'سُكن — قالب موقع عقارات',
    titleEn: 'SUKN — Property Website Template',
    titleCkb: 'سوکن — تێمپلەیتی ماڵپەڕی خانووبەرە',
    tagline:
      'عرض عقاري بالأخضر والكريمي، فلاتر مباشرة، رسومات معمارية، وطلب معاينة تجريبي',
    taglineEn:
      'Forest green and cream property listings, live filters, architectural illustrations and demo viewing requests',
    taglineCkb:
      'موڵکەکان بە سەوز و کرێمی، پاڵاوتنی ڕاستەوخۆ، وێنەی تەلارسازی و داوای سەردانی نموونەیی',
    description:
      'قالب عقاري تجريبي بالعربية والإنجليزية لعلامة خيالية، يضم ستة مساكن توضيحية. يمكن تصفية النتائج حسب البيع أو الإيجار ونوع المسكن والمنطقة، ثم فتح التفاصيل والتنقل بين رسومات الواجهة والداخل والمخطط التوضيحي. يربط دليل الأحياء بالنتائج المناسبة، وينقل اختيار المسكن إلى نموذج طلب المعاينة. تشمل الصفحة خطوات العمل والأسئلة الشائعة؛ لا تُرسل طلبات فعلية، والمساكن والأسعار والرسومات أمثلة لعرض تجربة الاستخدام.',
    descriptionEn:
      'A bilingual property demonstration for a fictional brand, featuring six illustrative residences. Visitors can filter by sale or rent, property type and neighbourhood, then open details and browse original facade, interior and schematic-plan illustrations. Neighbourhood cards select relevant listings, while viewing requests carry the chosen residence into a demo form. A process section and FAQs complete the page. No requests are transmitted; properties, prices and drawings are examples used to demonstrate the experience.',
    descriptionCkb:
      'تێمپلەیتێکی تاقیکردنەوەی خانووبەرە بە عەرەبی و ئینگلیزی بۆ براندێکی خەیاڵی، بە شەش شوێنی نیشتەجێبوونی نموونەیی. سەردانکەر دەتوانێت بەپێی فرۆشتن یان کرێ، جۆری موڵک و گەڕەک ئەنجامەکان بپاڵێوێت، وردەکارییەکان بکاتەوە و وێنەکانی ڕووکار و ناوەوە و نەخشەی ڕوونکەرەوە ببینێت. کارتەکانی گەڕەک موڵکە پەیوەندیدارەکان هەڵدەبژێرن و موڵکی هەڵبژێردراو دەخرێتە ناو فۆڕمی داوای سەردان. بەشی هەنگاوەکانی کار و پرسیارە باوەکانیش هەیە. هیچ داواکارییەک نانێردرێت؛ موڵک و نرخ و وێنەکان تەنها بۆ پیشاندانی ئەزموونی بەکارهێنانن.',
    tags: ['Next.js', 'Tailwind CSS', 'Motion', 'Filters', 'SVG', 'RTL'],
  },
  {
    demo: 'gym',
    title: 'نبض — قالب موقع نادٍ رياضي',
    titleEn: 'PULSE — Training Club Template',
    titleCkb: 'نەبز — تێمپلەیتی یانەی وەرزشی',
    tagline: 'هوية رياضية داكنة، جدول حصص بفلاتر، خطط عضوية، وتجربة تسجيل',
    taglineEn:
      'A dark training identity, a filterable class timetable, membership plans and a demo signup',
    taglineCkb:
      'ناسنامەیەکی وەرزشی تاریک، خشتەی وانە بە پاڵاوتن، پلانی ئەندامێتی و تۆمارکردنی نموونەیی',
    description:
      'قالب تجريبي بالعربية والإنجليزية لنادٍ رياضي خيالي، بأخضر داكن ولمسات ليمونية. يعرض مساحات التدريب وبرامجه، وجدول حصص يمكن تصفيته حسب اليوم ونوع التدريب. يستطيع الزائر استعراض خطط العضوية وتجربة التسجيل، مع بطاقات لأدوار تدريبية توضيحية والأسئلة الشائعة. النماذج تعرض تأكيداً محلياً فقط، من دون تسجيل عضوية أو تحصيل مبلغ. المواعيد والأسعار والأدوار التدريبية أمثلة توضيحية قابلة للاستبدال بمحتوى النادي الحقيقي.',
    descriptionEn:
      'An Arabic and English demonstration for a fictional training club in dark green and electric lime. Training spaces and programmes accompany a class timetable that filters by day and training type. Visitors can review membership plans and try a signup flow, alongside illustrative coaching roles and FAQs. Forms display a local confirmation without registering a membership or collecting payment. Schedules, prices and coaching roles are illustrative examples that a real club would replace with its own content.',
    descriptionCkb:
      'تێمپلەیتێکی تاقیکردنەوە بە عەرەبی و ئینگلیزی بۆ یانەیەکی وەرزشی خەیاڵی، بە سەوزی تاریک و لیمۆیی. شوێن و بەرنامەکانی ڕاهێنان لەگەڵ خشتەی وانەکان پیشان دەدات؛ دەتوانیت خشتەکە بەپێی ڕۆژ و جۆری ڕاهێنان بپاڵێویت. سەردانکەر دەتوانێت پلانەکانی ئەندامێتی ببینێت و تۆمارکردن تاقی بکاتەوە، هەروەها ناساندنی ڕۆڵەکانی ڕاهێنان و پرسیارە باوەکان بخوێنێتەوە. فۆڕمەکان تەنها پەیامی پشتڕاستکردنەوە لە ناو لاپەڕە پیشان دەدەن؛ ئەندامێتی تۆمار ناکرێت و پارە وەرناگیرێت. کات و نرخ و ڕۆڵەکانی ڕاهێنان نموونەن و یانەی ڕاستەقینە دەتوانێت بە ناوەڕۆکی خۆی بیانگۆڕێت.',
    tags: ['Next.js', 'Tailwind CSS', 'Motion', 'Filters', 'Forms', 'RTL'],
  },
  {
    demo: 'appliances',
    title: 'متين — قالب متجر أجهزة منزلية',
    titleEn: 'MATIN — Home Appliance Store Template',
    titleCkb: 'مەتین — تێمپلەیتی فرۆشگای ئامێری ناوماڵ',
    tagline:
      'كتالوج أجهزة بهوية كريمية وخضراء، بحث وتصنيفات، وسلة مشتريات تجريبية',
    taglineEn:
      'A cream and green appliance catalogue with search, categories and an interactive demo basket',
    taglineCkb:
      'کاتەلۆگی ئامێر بە کرێمی و سەوز، گەڕان و پۆلەکان و سەبەتەیەکی تاقیکردنەوە',
    description:
      'قالب متجر تجريبي بالعربية والإنجليزية لعلامة أجهزة منزلية خيالية. يضم ستة منتجات برسومات توضيحية، وتصنيفات وبحثاً نصياً وترتيباً حسب السعر، مع نافذة لعرض تفاصيل كل جهاز. تدعم السلة إضافة المنتجات وتعديل الكميات وإزالة العناصر وحساب المجموع، ثم عرض تأكيد لطلب تجريبي. تتضمن الصفحة قصة العلامة وأسئلة شائعة ونموذج استفسار؛ لا توجد دفعات أو طلبات أو رسائل فعلية، والأسعار والمواصفات أمثلة وليست عروض بيع.',
    descriptionEn:
      'An Arabic and English store demonstration for a fictional home appliance brand. Six illustrated products support category filtering, text search and price sorting, with a detail dialog for each appliance. The basket supports adding products, editing quantities, removing items and calculating a subtotal before showing a demo order confirmation. A brand story, FAQs and an inquiry form complete the experience. No payments, orders or messages are sent; prices and specifications are examples rather than sales offers.',
    descriptionCkb:
      'تێمپلەیتی فرۆشگایەکی تاقیکردنەوە بە عەرەبی و ئینگلیزی بۆ براندێکی خەیاڵیی ئامێری ناوماڵ. شەش بەرهەمی وێنەکێشراو لەگەڵ پاڵاوتن بەپێی پۆل، گەڕان بە دەق و ڕیزکردن بەپێی نرخ هەیە؛ هەر ئامێرێک پەنجەرەی وردەکاریی خۆی هەیە. سەبەتەکە زیادکردنی بەرهەم، گۆڕینی ژمارە، سڕینەوە و هەژمارکردنی کۆی نرخ پشتگیری دەکات و پاشان پشتڕاستکردنەوەی داواکارییەکی نموونەیی پیشان دەدات. چیرۆکی براند، پرسیارە باوەکان و فۆڕمی پرسیاریش هەیە. هیچ پارەدان یان داواکاری یان پەیامێک نانێردرێت؛ نرخ و تایبەتمەندییەکان نموونەن، نەک پێشنیاری فرۆشتن.',
    tags: ['Next.js', 'Tailwind CSS', 'Catalog', 'Cart', 'i18n', 'RTL'],
  },
  {
    demo: 'phones',
    title: 'كونكت — قالب متجر هواتف وإكسسوارات',
    titleEn: 'CONNECT — Phones & Accessories Store Template',
    titleCkb: 'کۆنێکت — تێمپلەیتی فرۆشگای مۆبایل و پێداویستی',
    tagline:
      'متجر تقني بالأبيض والبنفسجي، بحث وفلاتر، تفاصيل المنتجات، وسلة تجريبية',
    taglineEn:
      'A white and violet tech store with search, filters, product details and a working demo basket',
    taglineCkb:
      'فرۆشگای تەکنەلۆژیا بە سپی و مۆر، گەڕان و پاڵاوتن، وردەکاریی بەرهەم و سەبەتەی تاقیکردنەوە',
    description:
      'قالب متجر تجريبي بالعربية والإنجليزية لعلامة هواتف وإكسسوارات خيالية. يعرض هاتفين وسماعات وساعة وشاحناً وغطاءً برسومات أصلية، مع تصنيفات وبحث وترتيب حسب السعر وتفاصيل لكل منتج. يمكن إضافة المنتجات إلى السلة وتعديل الكميات وإزالتها ومراجعة المجموع بالدينار العراقي، ثم تجربة تأكيد الطلب. جميع الأسعار والمواصفات توضيحية؛ لا يتصل القالب بمخزون أو بوابة دفع ولا يرسل طلبات شراء أو رسائل فعلية.',
    descriptionEn:
      'An Arabic and English store demonstration for a fictional phone and accessory brand. Two phones, earbuds, a watch, a charger and a case use original illustrations, with category filters, search, price sorting and individual product details. Visitors can add products to a basket, change quantities, remove items and review the total in Iraqi dinars before trying an order confirmation. All prices and specifications are illustrative. The template has no stock or payment connection and sends no real purchase orders or messages.',
    descriptionCkb:
      'تێمپلەیتی فرۆشگایەکی تاقیکردنەوە بە عەرەبی و ئینگلیزی بۆ براندێکی خەیاڵیی مۆبایل و پێداویستی. دوو مۆبایل، گوێگر، کاتژمێر، شەحنکەر و بەرگی مۆبایل بە وێنەی تایبەت پیشان دەدات، لەگەڵ پاڵاوتن بەپێی پۆل، گەڕان، ڕیزکردن بەپێی نرخ و وردەکاریی هەر بەرهەمێک. سەردانکەر دەتوانێت بەرهەم بۆ سەبەتە زیاد بکات، ژمارە بگۆڕێت، کاڵا بسڕێتەوە و کۆی نرخ بە دیناری عێراقی ببینێت، پاشان پشتڕاستکردنەوەی داواکاری تاقی بکاتەوە. هەموو نرخ و تایبەتمەندییەکان نموونەن؛ تێمپلەیتەکە بە کۆگا یان دەروازەی پارەدان نەبەستراوەتەوە و هیچ داواکاریی کڕین یان پەیامی ڕاستەقینە نانێرێت.',
    tags: ['Next.js', 'Tailwind CSS', 'Catalog', 'Cart', 'i18n', 'RTL'],
  },
  {
    demo: 'academy',
    title: 'فورما — قالب أكاديمية ودورات',
    titleEn: 'FORMA — Academy & Courses Template',
    titleCkb: 'فۆرما — تێمپلەیتی ئەکادیمیا و خول',
    tagline: 'تصميم باوهاوس مرح، فلاتر دورات، مسارات تعلم، وتجربة تسجيل',
    taglineEn: 'Playful Bauhaus design, course filters, learning paths, and demo enrollment',
    taglineCkb: 'دیزاینی باوهاوس، پاڵاوتنی خول، ڕێگای فێربوون و تۆمارکردنی نموونەیی',
    description: 'قالب أكاديمية إبداعية بالعربية والإنجليزية بألوان أساسية وأشكال هندسية مستوحاة من باوهاوس. يعرض ثلاث دورات للتصميم والتقنية والأعمال، مع فلاتر مباشرة حسب المجال وتفاصيل المدة والمستوى والمشروع النهائي. اختيار دورة ينقلها إلى تجربة التسجيل. تشمل الصفحة منهج التعلم ونموذجاً بتأكيد محلي فقط؛ لا يُرسل تسجيل أو رسالة ولا تُحفظ معلومات شخصية.',
    descriptionEn: 'A bilingual creative academy with primary colours and geometric forms inspired by Bauhaus. Three design, technology, and business courses include category filters, duration, level, and final project details. Choosing a course carries it into the enrollment experience. A learning approach and form with local confirmation complete the page; no enrollment or message is sent and no personal information is stored.',
    descriptionCkb: 'ئەکادیمیایەکی داهێنەرانە بە عەرەبی و ئینگلیزی، بە ڕەنگە سەرەتاییەکان و شێوە ئەندازەییەکانی باوهاوس. سێ خولی دیزاین و تەکنەلۆژیا و بازرگانی لەگەڵ پاڵاوتن و کات و ئاست و پڕۆژەی کۆتایی هەیە. خولی هەڵبژێردراو دەچێتە فۆڕمی تۆمارکردن. هیچ تۆمارکردن یان پەیامێک نانێردرێت و زانیاریی کەسی هەڵناگیرێت.',
    tags: ['Next.js', 'Bauhaus', 'Courses', 'Filters', 'i18n', 'RTL'],
  },
  {
    demo: 'hotel',
    title: 'سَها — قالب فندق بوتيك',
    titleEn: 'SAHA — Boutique Hotel Template',
    titleCkb: 'سەها — تێمپلەیتی هۆتێلی بۆتیک',
    tagline: 'ضيافة آرت ديكو بالكريمي والنبيذي، غرف وتجارب وحساب الإقامة وحجز تجريبي',
    taglineEn: 'Art Deco hospitality in cream and wine, with rooms, experiences, a stay calculator, and demo booking',
    taglineCkb: 'میوانداری بە ئارت دیکۆ و ڕەنگی کرێمی، ژوور و ئەزموون و هەژمارکردنی مانەوە و حیجزی نموونەیی',
    description: 'قالب فندق بوتيك تجريبي بالعربية والإنجليزية، بهوية آرت ديكو وأقواس معمارية وألوان كريمية ونبيذية. يعرض ثلاث فئات غرف وتجارب ضيافة مع اختيار الغرفة وعدد الليالي وحساب تكلفة الإقامة التوضيحية. نموذج الحجز يعرض تأكيداً داخل الصفحة فقط؛ لا ينشئ حجزاً أو دفعة ولا يرسل بيانات شخصية. الغرف والأسعار والمحتوى أمثلة لعرض التصميم.',
    descriptionEn: 'An Arabic and English boutique hotel demonstration with an Art Deco identity, architectural arches, and cream and wine colours. Three room categories and hospitality experiences accompany room and night selection with an illustrative stay total. The reservation form displays an on-page confirmation only; it creates no booking or payment and sends no personal details. Rooms, prices, and content are fictional design examples.',
    descriptionCkb: 'تێمپلەیتی هۆتێلێکی بۆتیک بە عەرەبی و ئینگلیزی و ناسنامەی ئارت دیکۆ و ڕەنگی کرێمی. سێ جۆری ژوور و ئەزموونی میوانداری هەیە، لەگەڵ هەڵبژاردنی ژوور و ژمارەی شەوان و هەژمارکردنی تێچوو. فۆڕمی حیجز تەنها پشتڕاستکردنەوەیەکی ناو لاپەڕە پیشان دەدات؛ هیچ حیجز یان پارەدانێک دروست ناکات و زانیاریی کەسی نانێرێت. ژوور و نرخ و ناوەڕۆکەکان نموونەن.',
    tags: ['Next.js', 'Art Deco', 'Hospitality', 'Booking', 'i18n', 'RTL'],
  },
  {
    demo: 'architecture',
    title: 'محور — قالب عمارة وتصميم داخلي',
    titleEn: 'AXIS — Architecture & Interiors Template',
    titleCkb: 'تەوەر — تێمپلەیتی تەلارسازی و دیزاینی ناوەوە',
    tagline: 'بساطة سويسرية، مشاريع بفلاتر، دراسات معمارية متعددة الزوايا، ونموذج استفسار',
    taglineEn: 'Swiss minimalism, filtered projects, architectural studies with multiple views, and an inquiry form',
    taglineCkb: 'سادەیی سویسری، پاڵاوتنی پڕۆژە و دیمەنەکانی تەلارسازی و فۆڕمی پرسیار',
    description: 'قالب استوديو معماري بالعربية والإنجليزية بتصميم سويسري بسيط وخطوط دقيقة وفراغات واسعة. يعرض ثلاث دراسات تصميمية برسومات أصلية، وفلاتر للأعمال السكنية والتجارية. يمكن فتح كل دراسة والتبديل بين الواجهة والداخل والمخطط مع تفاصيل الموقع والمساحة والخامات. قسم منهج العمل ونموذج استفسار يكملان التجربة. المشاريع مفاهيم توضيحية وليست أعمال عملاء منفّذة، والنموذج لا يرسل رسائل فعلية.',
    descriptionEn: 'A bilingual architectural practice with Swiss minimalism, precise typography, and generous space. Three concept studies use original illustrations and residential or commercial filters. Each study expands to exterior, interior, and plan views with location, area, and material details. A practice approach and demo inquiry form complete the experience. Projects are illustrative concepts rather than completed client commissions, and the form sends no real messages.',
    descriptionCkb: 'تێمپلەیتی ستودیۆی تەلارسازی بە عەرەبی و ئینگلیزی و سادەیی سویسری و بۆشایی فراوان. سێ لێکۆڵینەوەی دیزاین بە وێنەی تایبەت و پاڵاوتنی کارە نیشتەجێبوون و بازرگانییەکان هەیە. هەر پڕۆژەیەک دیمەنی ڕووکار و ناوەوە و نەخشە پیشان دەدات لەگەڵ شوێن و ڕووبەر و کەرەستە. ڕێبازی کار و فۆڕمی پرسیار ئەزموونەکە تەواو دەکەن. پڕۆژەکان نموونەن نەک کاری جێبەجێکراوی کڕیار، و فۆڕمەکە پەیامی ڕاستەقینە نانێرێت.',
    tags: ['Next.js', 'Swiss Design', 'Architecture', 'Portfolio', 'SVG', 'RTL'],
  },
];

export const ADDITIONAL_TEMPLATE_PROJECTS: ProjectInsert[] = TEMPLATES.map(
  ({ demo, ...copy }, index) => ({
    ...copy,
    slug: `template-${demo}`,
    category: 'website',
    client: 'قالب تجريبي — DevsHub.cc',
    clientEn: 'DevsHub.cc template',
    clientCkb: 'تێمپلەیتی تاقیکردنەوە — DevsHub.cc',
    liveUrl: `/demos/${demo}/ar`,
    repoUrl: '',
    coverImage: `/demos/covers/${demo}-ar.jpg`,
    gallery: [`/demos/covers/${demo}-ar.jpg`, `/demos/covers/${demo}-en.jpg`],
    featured: true,
    published: true,
    year: 2026,
    sortOrder: -4 + index,
  }),
);

export const ADDITIONAL_TEMPLATE_SLUGS = ADDITIONAL_TEMPLATE_PROJECTS.map(
  (project) => project.slug,
);
