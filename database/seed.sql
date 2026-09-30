-- ============================================================================
--  EShopping - demo seed data
--  Apply AFTER schema.sql:   mysql -u root eshopping < database/seed.sql
--  Demo customers all use the password: Password123
--  (hash below is bcrypt, cost 12)
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- Categories
-- ----------------------------------------------------------------------------
INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `icon`, `sort_order`, `status`) VALUES
  (1,  'Clothing',       'clothing',        'Everyday wear, ethnic and casual clothing for all.',      'FaUserTie',    1,  'active'),
  (2,  'Electronics',    'electronics',     'Phones, laptops, audio and everyday electronics.',         'FaLaptop',     2,  'active'),
  (3,  'Gadgets',        'gadgets',         'Smart home, wearables and useful little gadgets.',         'FaPlug',       3,  'active'),
  (4,  'Cosmetics',      'cosmetics',       'Skincare, haircare and makeup from trusted brands.',        'FaSprayCan',   4,  'active'),
  (5,  'Kitchen',        'kitchen',         'Cookware, appliances and dining essentials.',               'FaUtensils',   5,  'active'),
  (6,  'Home & Living',  'home-living',     'Furniture, decor and bedding for a better home.',          'FaCouch',      6,  'active'),
  (7,  'Shoes',          'shoes',           'Sneakers, formal shoes, sandals and boots.',               'FaRunning',    7,  'active'),
  (8,  'Bags',           'bags',            'Backpacks, handbags, laptop bags and travel gear.',        'FaShoppingBag',8,  'active'),
  (9,  'Sports',         'sports',          'Fitness, outdoor and sports equipment.',                    'FaDumbbell',   9,  'active'),
  (10, 'Accessories',    'accessories',     'Watches, sunglasses, wallets and more.',                    'FaGlasses',    10, 'active'),
  (11, 'Beauty',         'beauty',          'Makeup tools, brushes and beauty essentials.',              'FaMagic',      11, 'active'),
  (12, 'Other',          'other',           'Everything else worth shopping.',                           'FaBoxOpen',    12, 'active');

-- ----------------------------------------------------------------------------
-- Subcategories
-- ----------------------------------------------------------------------------
INSERT INTO `subcategories` (`id`, `category_id`, `name`, `slug`, `status`) VALUES
  (1,  1, 'Men',            'men',            'active'),
  (2,  1, 'Women',          'women',          'active'),
  (3,  1, 'Ethnic',         'ethnic',         'active'),
  (4,  2, 'Smartphones',    'smartphones',    'active'),
  (5,  2, 'Laptops',        'laptops',        'active'),
  (6,  2, 'Audio',          'audio',          'active'),
  (7,  3, 'Smart Home',     'smart-home',     'active'),
  (8,  3, 'Wearables',      'wearables',      'active'),
  (9,  5, 'Cookware',       'cookware',       'active'),
  (10, 5, 'Appliances',     'appliances',     'active'),
  (11, 7, 'Sneakers',       'sneakers',       'active'),
  (12, 7, 'Formal',         'formal',         'active'),
  (13, 8, 'Backpacks',      'backpacks',      'active'),
  (14, 8, 'Handbags',       'handbags',       'active'),
  (15, 9, 'Fitness',        'fitness',        'active'),
  (16, 9, 'Outdoor',        'outdoor',        'active'),
  (17, 10, 'Watches',       'watches',        'active'),
  (18, 10, 'Eyewear',       'eyewear',        'active');

-- ----------------------------------------------------------------------------
-- Customers (password for every account: Password123)
-- Admin (created by the seed, password same as the email address):
--   identifier: ihsafy2k21@gmail.com   password: ihsafy2k21@gmail.com
-- ----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `name`, `mobile`, `email`, `password_hash`, `role`, `status`, `address`, `city`, `area`, `created_at`) VALUES
  (1, 'Ayesha Rahman',   '01712345678', 'ayesha@example.com',  '$2a$12$29ZZOn3sS3jy5mry8AFJi.a5tqsAl8N3oF5xmlXdFPA2T3OwGvo5W', 'customer', 'active',   'House 12, Road 5, Banani',      'Dhaka',    'Banani',    '2026-01-12 10:15:00'),
  (2, 'Rakib Hasan',     '01812345678', 'rakib@example.com',   '$2a$12$29ZZOn3sS3jy5mry8AFJi.a5tqsAl8N3oF5xmlXdFPA2T3OwGvo5W', 'customer', 'active',   'Flat B3, Mirpur DOHS',          'Dhaka',    'Mirpur',    '2026-02-03 14:40:00'),
  (3, 'Nusrat Jahan',    '01912345678', 'nusrat@example.com',  '$2a$12$29ZZOn3sS3jy5mry8AFJi.a5tqsAl8N3oF5xmlXdFPA2T3OwGvo5W', 'customer', 'active',   'House 7, Zindabazar',           'Dhaka',    'Zindabazar','2026-02-20 09:05:00'),
  (4, 'Tanvir Ahmed',    '01612345678', 'tanvir@example.com',  '$2a$12$29ZZOn3sS3jy5mry8AFJi.a5tqsAl8N3oF5xmlXdFPA2T3OwGvo5W', 'customer', 'active',   'House 44, Agrabad C/A',         'Chattogram', 'Agrabad', '2026-03-08 17:22:00'),
  (5, 'Sadia Islam',     '01512345678', 'sadia@example.com',   '$2a$12$29ZZOn3sS3jy5mry8AFJi.a5tqsAl8N3oF5xmlXdFPA2T3OwGvo5W', 'customer', 'active',   'House 21, Shahjalal Road',      'Sylhet',   'Shahjalal', '2026-03-25 11:10:00'),
  (6, 'Imran Kabir',     '01412345678', 'imran@example.com',   '$2a$12$29ZZOn3sS3jy5mry8AFJi.a5tqsAl8N3oF5xmlXdFPA2T3OwGvo5W', 'customer', 'disabled', 'House 2, Bogura Sadar',         'Bogura',   'Sadar',     '2026-04-02 08:30:00'),
  (7, 'Mehedi Hasan',    '01312345678', 'mehedi@example.com',  '$2a$12$29ZZOn3sS3jy5mry8AFJi.a5tqsAl8N3oF5xmlXdFPA2T3OwGvo5W', 'customer', 'active',   'House 9, Rajshahi Cantonment', 'Rajshahi', 'Cantonment','2026-04-18 13:45:00'),
  (8, 'Farhana Akter',   '01212345678', 'farhana@example.com', '$2a$12$29ZZOn3sS3jy5mry8AFJi.a5tqsAl8N3oF5xmlXdFPA2T3OwGvo5W', 'customer', 'active',   'House 18, Khulna Sadar',       'Khulna',   'Sadar',     '2026-05-06 16:00:00'),
  (9, 'IH Safy',          '01724612320', 'ihsafy2k21@gmail.com', '$2a$12$EfoNZhsdrgiZ1XWg7uo9qe3moSexMbAvDZ3h6NkCU/WQ97BSvb5hW', 'admin',    'active',   'Dhaka',                       'Dhaka',    'Dhanmondi', '2026-01-01 09:00:00');

-- ----------------------------------------------------------------------------
-- Products
-- ----------------------------------------------------------------------------
INSERT INTO `products`
  (`id`, `category_id`, `subcategory_id`, `name`, `slug`, `description`, `short_description`, `sku`, `brand`, `tags`,
   `seo_title`, `seo_description`, `seo_keywords`, `original_price`, `discount`, `sale_price`, `stock`, `sold_count`,
   `featured`, `best_seller`, `new_arrival`, `status`, `created_at`) VALUES
  (1, 2, 4, 'Samsung Galaxy A55 5G', 'samsung-galaxy-a55-5g',
   'The Galaxy A55 blends a 6.6-inch Super AMOLED 120Hz display with a 50MP OIS main camera and a 5000mAh battery. The metal frame, IP67 rating and four years of OS updates make it a dependable everyday phone.',
   '6.6" Super AMOLED 120Hz, 50MP OIS camera, 5000mAh battery and IP67 durability.',
   'ESH-SAM-A55', 'Samsung', 'samsung,galaxy,a55,smartphone,5g,amoled',
   'Samsung Galaxy A55 5G - 128GB | EShopping', 'Buy the Samsung Galaxy A55 5G online with cash on delivery in Bangladesh.', 'samsung galaxy a55, samsung phone, 5g smartphone, buy samsung',
   49999.00, 18.00, 41019.00, 24, 0, 1, 1, 1, 'active', '2026-06-01 10:00:00'),

  (2, 2, 5, 'HP Pavilion 15 Laptop', 'hp-pavilion-15-laptop',
   'A 15.6-inch Full HD laptop powered by a 12th generation Intel Core i5, 16GB of RAM and a 512GB NVMe SSD. Built for study, work and light creative projects.',
   'Intel Core i5, 16GB RAM, 512GB SSD, 15.6" FHD display.',
   'ESH-HP-PV15', 'HP', 'hp,pavilion,laptop,notebook,intel,i5',
   'HP Pavilion 15 Laptop - Core i5 / 16GB / 512GB', 'HP Pavilion 15 with Core i5, 16GB RAM and 512GB SSD. Free delivery inside Dhaka.', 'hp pavilion 15, hp laptop, budget laptop bangladesh',
   72500.00, 12.00, 63800.00, 12, 0, 1, 0, 1, 'active', '2026-06-04 11:30:00'),

  (3, 1, 2, 'Premium Cotton Kurta', 'premium-cotton-kurta',
   'A breathable 100% combed cotton kurta with a mandarin collar and straight cut. Pre-washed so it keeps its shape and colour wash after wash.',
   'Soft combed cotton kurta with mandarin collar.',
   'ESH-CLO-KUR01', 'Eshop Basics', 'kurta,cotton,ethnic,clothing,women',
   'Premium Cotton Kurta - Eshop Basics', 'Everyday breathable cotton kurta for men and women.', 'cotton kurta, ethnic wear, bangladesh clothing',
   1850.00, 25.00, 1387.50, 60, 0, 1, 1, 0, 'active', '2026-05-11 09:20:00'),

  (4, 4, NULL, 'Hydrating Vitamin C Serum', 'hydrating-vitamin-c-serum',
   'A lightweight 10% vitamin C serum with hyaluronic acid that brightens dull skin and smooths fine lines. Fragrance free, suitable for all skin types.',
   '10% Vitamin C + Hyaluronic Acid for brighter, smoother skin.',
   'ESH-COS-VC10', 'GlowLab', 'skincare,vitamin c,serum,hyaluronic,glow',
   'Hydrating Vitamin C Serum 30ml - GlowLab', 'Brighten and hydrate with 10% vitamin C serum. 30ml bottle.', 'vitamin c serum, skincare, glow serum, face serum',
   1450.00, 30.00, 1015.00, 45, 0, 1, 1, 1, 'active', '2026-06-08 15:45:00'),

  (5, 7, 11, 'Urban Runner Sneakers', 'urban-runner-sneakers',
   'Lightweight running shoes with a responsive foam midsole and a breathable engineered mesh upper. Built for daily training and long walks.',
   'Breathable mesh running shoes with cushioned foam sole.',
   'ESH-SHO-UR01', 'Stride', 'sneakers,running,shoes,footwear,comfort',
   'Urban Runner Sneakers - Stride', 'Lightweight breathable running sneakers for men and women.', 'running shoes, sneakers, sports shoes bangladesh',
   4200.00, 20.00, 3360.00, 38, 0, 1, 1, 0, 'active', '2026-05-20 12:00:00'),

  (6, 8, 13, 'Laptop Backpack 30L', 'laptop-backpack-30l',
   'A 30-litre water-resistant backpack with a padded 16-inch laptop compartment, USB charging port and hidden anti-theft pocket.',
   'Water-resistant 30L backpack with padded 16" laptop sleeve.',
   'ESH-BAG-BP30', 'TrailMate', 'backpack,laptop bag,travel,water resistant',
   'Laptop Backpack 30L - TrailMate', 'Water-resistant 30L laptop backpack with USB charging port.', 'laptop backpack, travel bag, office bag',
   3200.00, 35.00, 2080.00, 52, 0, 0, 1, 1, 'active', '2026-06-11 08:15:00'),

  (7, 5, 10, 'Digital Air Fryer 5.5L', 'digital-air-fryer-55l',
   'A 5.5-litre digital air fryer with eight presets, a non-stick basket and an auto shut-off. Fry, bake, grill and roast with little to no oil.',
   '5.5L digital air fryer with 8 cooking presets.',
   'ESH-KIT-AF55', 'Chefline', 'air fryer,kitchen,appliance,cooking',
   'Digital Air Fryer 5.5L - Chefline', 'Family-size digital air fryer with 8 presets and non-stick basket.', 'air fryer, kitchen appliance, digital air fryer',
   6500.00, 22.00, 5070.00, 18, 0, 1, 1, 1, 'active', '2026-06-14 13:00:00'),

  (8, 3, 8, 'Smart Watch Fitness Tracker', 'smart-watch-fitness-tracker',
   'A 1.83-inch AMOLED fitness watch with heart-rate monitoring, SpO2, sleep tracking and 14 days of battery life. Works with Android and iOS.',
   'AMOLED display, 14-day battery, heart rate and SpO2 tracking.',
   'ESH-GAD-SW01', 'PulseFit', 'smartwatch,fitness tracker,wearable,bluetooth',
   'Smart Watch Fitness Tracker - PulseFit', 'AMOLED fitness smart watch with 14-day battery life.', 'smart watch, fitness tracker, wearable',
   3800.00, 28.00, 2736.00, 40, 0, 0, 1, 1, 'active', '2026-06-15 10:30:00'),

  (9, 6, NULL, 'Slimfit Bed Mattress Queen', 'slimfit-bed-mattress-queen',
   'A 7-zone pocket spring mattress with memory foam topper, 300 kg load capacity and removable washable cover. 10 years of warranty.',
   '7-zone pocket spring queen mattress with memory foam.',
   'ESH-HOM-MT01', 'SleepWell', 'mattress,bed,home,sleep,queen',
   'Slimfit Bed Mattress Queen - SleepWell', '7-zone pocket spring mattress with memory foam topper.', 'mattress, queen mattress, bed',
   24500.00, 15.00, 20825.00, 8, 0, 1, 0, 0, 'active', '2026-04-28 09:00:00'),

  (10, 9, 15, 'Adjustable Dumbbell Set 20kg', 'adjustable-dumbbell-set-20kg',
   'Six weight plates on a single bar that adjust from 2kg to 20kg, saving floor space compared with a full rack. Non-slip knurled handle.',
   '2kg to 20kg adjustable dumbbell pair in a compact design.',
   'ESH-SPT-DB20', 'FitCore', 'dumbbell,fitness,gym,weights,home workout',
   'Adjustable Dumbbell Set 20kg - FitCore', 'Space-saving adjustable dumbbells from 2kg to 20kg.', 'dumbbell set, home gym, adjustable weights',
   7800.00, 20.00, 6240.00, 15, 0, 0, 1, 0, 'active', '2026-05-30 14:10:00'),

  (11, 10, 17, 'Classic Analog Wrist Watch', 'classic-analog-wrist-watch',
   'A 40mm stainless steel case with a sapphire-coated crystal, Japanese quartz movement and a genuine leather strap that ages nicely.',
   'Stainless steel case, Japanese quartz movement, leather strap.',
   'ESH-ACC-WT01', 'Horizon', 'watch,analog,leather,stainless,accessory',
   'Classic Analog Wrist Watch - Horizon', 'Sapphire-coated 40mm analog watch with a leather strap.', 'analog watch, wrist watch, leather watch',
   5500.00, 18.00, 4510.00, 22, 0, 0, 0, 0, 'active', '2026-05-14 11:00:00'),

  (12, 2, 6, 'Wireless Over-Ear Headphones', 'wireless-over-ear-headphones',
   'Active noise cancelling headphones with 40mm drivers, 35 hours of playback and multipoint Bluetooth so you can switch between a laptop and phone.',
   'ANC wireless headphones, 40mm drivers, 35-hour battery.',
   'ESH-ELE-ANC01', 'Sonicore', 'headphones,bluetooth,anc,audio,wireless',
   'Wireless Over-Ear Headphones - Sonicore', 'Active noise cancelling over-ear headphones with 35-hour battery.', 'wireless headphones, anc headphones, bluetooth headset',
   8900.00, 24.00, 6764.00, 26, 0, 1, 1, 1, 'active', '2026-06-17 16:40:00'),

  (13, 1, 3, 'Cotton Panjabi (Fatua)', 'cotton-panjabi-fatua',
   'A traditional panjabi cut from soft woven cotton with a slim fit and a clean collar. Finished with tone-on-tone embroidery on the placket.',
   'Traditional cotton panjabi with slim fit and embroidered placket.',
   'ESH-CLO-PJ01', 'Eshop Basics', 'panjabi,fatua,ethnic,men,cotton',
   'Cotton Panjabi (Fatua) - Eshop Basics', 'Slim-fit traditional cotton panjabi for festivals and everyday wear.', 'panjabi, fatua, ethnic wear for men',
   2400.00, 20.00, 1920.00, 55, 0, 0, 1, 0, 'active', '2026-06-02 10:20:00'),

  (14, 5, 9, 'Non-Stick Cookware Set', 'non-stick-cookware-set',
   'A seven-piece non-stick cookware set with a granite coating, induction-compatible base and cool-touch handles. Oven safe up to 180C.',
   '7-piece granite non-stick set, induction ready.',
   'ESH-KIT-CP07', 'Chefline', 'cookware,non stick,kitchen,frying pan',
   'Non-Stick Cookware Set 7-Piece - Chefline', 'Granite-coated 7-piece non-stick cookware set, induction ready.', 'non stick cookware set, kitchen set, frying pan',
   8900.00, 32.00, 6052.00, 14, 0, 1, 0, 1, 'active', '2026-06-09 12:00:00'),

  (15, 11, NULL, 'Makeup Brush Set 12pc', 'makeup-brush-set-12pc',
   'Twelve synthetic fibre brushes with vegan bristles, aluminium ferrules and a travel roll. Non-animal cruelty free.',
   '12 vegan brushes in a travel roll, cruelty free.',
   'ESH-BTY-BR12', 'GlowLab', 'makeup,brush,beauty,cosmetics,tools',
   'Makeup Brush Set 12pc - GlowLab', '12-piece vegan makeup brush set with a travel roll.', 'makeup brush, beauty tools, brush set',
   2200.00, 30.00, 1540.00, 33, 0, 0, 1, 1, 'active', '2026-06-12 09:40:00'),

  (16, 3, 7, 'Smart LED Bulb Pack (4)', 'smart-led-bulb-pack-4',
   'Four E27 smart bulbs with 16 million colours, scheduling and app control. Works with Alexa and Google Assistant over Wi-Fi.',
   '4 E27 smart bulbs, 16M colours, app and voice control.',
   'ESH-GAD-BL04', 'LumiHome', 'smart bulb,led,smart home,alexa,google',
   'Smart LED Bulb Pack of 4 - LumiHome', 'Wi-Fi smart LED bulbs with 16 million colours and voice control.', 'smart bulb, led bulb, smart home lighting',
   3600.00, 16.00, 3024.00, 48, 0, 0, 0, 1, 'active', '2026-06-18 08:30:00'),

  (17, 7, 12, 'Formal Leather Oxford Shoes', 'formal-leather-oxford-shoes',
   'Genuine leather oxford shoes with a Goodyear-welted sole, leather lining and a cork bed that moulds to your foot.',
   'Genuine leather formal oxford with a welted sole.',
   'ESH-SHO-OX01', 'Stride', 'formal shoes,leather,oxford,men,office',
   'Formal Leather Oxford Shoes - Stride', 'Genuine leather Goodyear-welted formal oxford shoes.', 'formal shoes, leather oxford, office shoes',
   6900.00, 20.00, 5520.00, 19, 0, 0, 0, 0, 'active', '2026-05-25 13:50:00'),

  (18, 8, 14, 'Elegant Leather Handbag', 'elegant-leather-handbag',
   'A structured top-handle handbag in pebbled leather with a detachable strap, suede lining and three interior pockets.',
   'Structured pebbled leather handbag with detachable strap.',
   'ESH-BAG-HB01', 'Maison Lane', 'handbag,leather,purse,women,bag',
   'Elegant Leather Handbag - Maison Lane', 'Pebbled leather top-handle handbag with detachable strap.', 'leather handbag, ladies bag, purse',
   4900.00, 26.00, 3626.00, 17, 0, 1, 0, 1, 'active', '2026-06-06 15:15:00'),

  (19, 9, 16, 'Foldable Camping Tent', 'foldable-camping-tent',
   'A two-person dome tent with a 3000mm waterproof fly, taped seams and a one-minute fold design. Includes footprint and pegs.',
   '2-person waterproof dome tent, folds in one minute.',
   'ESH-SPT-TN02', 'TrailMate', 'tent,camping,outdoor,hiking,travel',
   'Foldable Camping Tent - TrailMate', 'Waterproof 2-person dome tent for camping trips.', 'camping tent, hiking tent, outdoor tent',
   11500.00, 18.00, 9430.00, 11, 0, 0, 1, 0, 'active', '2026-05-18 10:05:00'),

  (20, 2, 4, 'Budget Smartphone X7', 'budget-smartphone-x7',
   'A 6.5-inch HD+ smartphone with a 50MP dual camera, 5000mAh battery and a 90Hz display. A great first phone or backup device.',
   '6.5" 90Hz display, 50MP camera, 5000mAh battery.',
   'ESH-SMA-X701', 'NovaTech', 'smartphone,budget phone,novatech,android',
   'Budget Smartphone X7 - NovaTech', 'Affordable 6.5-inch smartphone with 50MP camera and 90Hz display.', 'budget smartphone, cheap phone bangladesh',
   12999.00, 22.00, 10139.00, 30, 0, 0, 1, 1, 'active', '2026-06-19 11:30:00'),

  (21, 6, NULL, 'Ergonomic Office Chair', 'ergonomic-office-chair',
   'A mesh-back office chair with adjustable lumbar support, 4D armrests and a synchro-tilt mechanism. Rated for 8 hours of daily use.',
   'Mesh-back office chair with lumbar support and 4D armrests.',
   'ESH-HOM-CH01', 'WorkNest', 'office chair,ergonomic,home,furniture',
   'Ergonomic Office Chair - WorkNest', 'Adjustable mesh office chair with lumbar support and 4D armrests.', 'office chair, ergonomic chair, home office chair',
   13500.00, 15.00, 11475.00, 9, 0, 1, 0, 0, 'active', '2026-04-22 14:00:00'),

  (22, 10, 18, 'Polarised Sunglasses', 'polarised-sunglasses',
   'UV400 polarised lenses in a lightweight TR90 frame with spring hinges. Includes a hard case and cleaning cloth.',
   'UV400 polarised lenses in a lightweight TR90 frame.',
   'ESH-ACC-SG01', 'Horizon', 'sunglasses,polarised,uv400,eyewear',
   'Polarised Sunglasses - Horizon', 'UV400 polarised sunglasses with a hard case included.', 'sunglasses, polarised sunglasses, uv protection',
   2400.00, 25.00, 1800.00, 44, 0, 0, 0, 1, 'active', '2026-06-10 16:20:00'),

  (23, 4, NULL, 'Anti-Hairfall Shampoo 400ml', 'anti-hairfall-shampoo-400ml',
   'A sulphate-free shampoo with caffeine, biotin and amino acids that reduces hair fall and strengthens roots.',
   'Sulphate-free anti-hairfall shampoo with caffeine and biotin.',
   'ESH-COS-SH01', 'GlowLab', 'shampoo,hairfall,biotin,haircare,caffeine',
   'Anti-Hairfall Shampoo 400ml - GlowLab', 'Sulphate-free shampoo with caffeine and biotin to reduce hair fall.', 'anti hairfall shampoo, biotin shampoo, hair care',
   950.00, 20.00, 760.00, 68, 0, 0, 1, 0, 'active', '2026-05-08 10:00:00'),

  (24, 12, NULL, 'Minimalist Desk Organiser', 'minimalist-desk-organiser',
   'A solid bamboo desk organiser with a pen tray, sticky note slot and a phone stand. Keeps a small desk tidy without taking up space.',
   'Solid bamboo organiser with pen tray and phone stand.',
   'ESH-OTH-DO01', 'WorkNest', 'desk,organiser,bamboo,office,accessory',
   'Minimalist Desk Organiser - WorkNest', 'Bamboo desk organiser with pen tray, note slot and phone stand.', 'desk organiser, bamboo organiser, office accessory',
   1250.00, 20.00, 1000.00, 50, 0, 0, 0, 1, 'active', '2026-06-16 09:15:00'),

  (25, 2, 6, 'Portable Bluetooth Speaker', 'portable-bluetooth-speaker',
   'A palm-sized speaker with 20W stereo output, IPX7 waterproofing and 15 hours of playtime. Pairs two units for true stereo.',
   '20W IPX7 waterproof speaker with 15-hour battery.',
   'ESH-ELE-SP20', 'Sonicore', 'speaker,bluetooth,portable,waterproof,audio',
   'Portable Bluetooth Speaker - Sonicore', '20W waterproof portable Bluetooth speaker with 15-hour battery.', 'bluetooth speaker, portable speaker, waterproof speaker',
   4200.00, 28.00, 3024.00, 36, 0, 0, 1, 1, 'active', '2026-06-07 13:25:00'),

  (26, 1, 1, 'Oxford Slim Fit Shirt', 'oxford-slim-fit-shirt',
   'A wrinkle-resistant oxford shirt in a slim fit with mother-of-pearl buttons. Holds its shape through the day.',
   'Wrinkle-resistant slim fit oxford shirt.',
   'ESH-CLO-SH01', 'Eshop Basics', 'shirt,oxford,mens,slim fit,formal',
   'Oxford Slim Fit Shirt - Eshop Basics', 'Wrinkle-resistant oxford shirt with a slim fit for work and events.', 'oxford shirt, formal shirt men, slim fit shirt',
   1900.00, 22.00, 1482.00, 58, 0, 0, 0, 1, 'active', '2026-05-28 11:45:00'),

  (27, 7, 11, 'Knit Running Sneakers', 'knit-running-sneakers',
   'A one-piece knit upper with no seams to rub, plus a carbon rubber outsole and a cushioned insole for long runs.',
   'Seamless knit upper with carbon rubber outsole.',
   'ESH-SHO-KN01', 'Stride', 'sneakers,running,knit,sports,footwear',
   'Knit Running Sneakers - Stride', 'Seamless knit running sneakers with a carbon rubber outsole.', 'knit sneakers, running shoes, sports footwear',
   5600.00, 30.00, 3920.00, 0, 0, 0, 0, 1, 'active', '2026-06-20 08:00:00'),

  (28, 6, NULL, 'Cotton Bedsheet Set (King)', 'cotton-bedsheet-set-king',
   'A king-size bedsheet and two pillow covers in 300 thread-count cotton with a subtle jacquard pattern. Colour-fast and shrink resistant.',
   'King bedsheet with two pillow covers, 300 TC cotton.',
   'ESH-HOM-BS01', 'SleepWell', 'bedsheet,bed,home,cotton,pillow',
   'Cotton Bedsheet Set (King) - SleepWell', 'King-size 300 TC cotton bedsheet with two pillow covers.', 'bedsheet, cotton bedsheet, king bedsheet',
   3400.00, 18.00, 2788.00, 27, 0, 0, 1, 0, 'active', '2026-05-16 15:30:00'),

  (29, 5, 10, 'Stainless Steel Water Bottle', 'stainless-steel-water-bottle',
   'A 750ml double-wall vacuum bottle that keeps drinks cold for 24 hours or hot for 12. Leak-resistant lid, powder-coated finish.',
   '750ml double-wall vacuum bottle, 24h cold / 12h hot.',
   'ESH-KIT-WB75', 'Chefline', 'water bottle,vacuum,stainless,kitchen,bottle',
   'Stainless Steel Water Bottle 750ml - Chefline', 'Double-wall vacuum bottle that keeps drinks cold for 24 hours.', 'water bottle, vacuum flask, steel bottle',
   1450.00, 20.00, 1160.00, 70, 0, 0, 0, 1, 'active', '2026-06-05 12:40:00'),

  (30, 9, 15, 'Yoga Mat with Carry Strap', 'yoga-mat-with-carry-strap',
   'A 6mm non-slip TPE yoga mat with alignment lines, 183cm long and 66cm wide. Includes a carry strap.',
   '6mm non-slip TPE yoga mat with alignment lines.',
   'ESH-SPT-YM01', 'FitCore', 'yoga mat,fitness,exercise,non slip',
   'Yoga Mat with Carry Strap - FitCore', '6mm non-slip TPE yoga mat with alignment lines and carry strap.', 'yoga mat, exercise mat, fitness mat',
   2100.00, 25.00, 1575.00, 42, 0, 1, 0, 0, 'active', '2026-05-22 10:50:00');

-- ----------------------------------------------------------------------------
-- Product images (local files in backend/uploads/products, sourced from Wikimedia Commons / Openverse
-- see database/image-sources.json for per-image attribution)
-- ----------------------------------------------------------------------------
INSERT INTO `product_images` (`product_id`, `image_url`, `alt_text`, `sort_order`) VALUES
  (1, '/uploads/products/samsung-galaxy-a55-5g-1.jpg', 'samsung galaxy a55 5g photo 1', 0),
  (1, '/uploads/products/samsung-galaxy-a55-5g-2.jpg', 'samsung galaxy a55 5g photo 2', 1),
  (1, '/uploads/products/samsung-galaxy-a55-5g-3.jpg', 'samsung galaxy a55 5g photo 3', 2),
  (2, '/uploads/products/hp-pavilion-15-laptop-1.jpg', 'hp pavilion 15 laptop photo 1', 0),
  (2, '/uploads/products/hp-pavilion-15-laptop-2.jpg', 'hp pavilion 15 laptop photo 2', 1),
  (3, '/uploads/products/premium-cotton-kurta-1.jpg', 'premium cotton kurta photo 1', 0),
  (3, '/uploads/products/premium-cotton-kurta-2.jpg', 'premium cotton kurta photo 2', 1),
  (4, '/uploads/products/hydrating-vitamin-c-serum-1.jpg', 'hydrating vitamin c serum photo 1', 0),
  (4, '/uploads/products/hydrating-vitamin-c-serum-2.jpg', 'hydrating vitamin c serum photo 2', 1),
  (5, '/uploads/products/urban-runner-sneakers-1.jpg', 'urban runner sneakers photo 1', 0),
  (5, '/uploads/products/urban-runner-sneakers-2.jpg', 'urban runner sneakers photo 2', 1),
  (6, '/uploads/products/laptop-backpack-30l-1.jpg', 'laptop backpack 30l photo 1', 0),
  (6, '/uploads/products/laptop-backpack-30l-2.jpg', 'laptop backpack 30l photo 2', 1),
  (7, '/uploads/products/digital-air-fryer-55l-1.jpg', 'digital air fryer 55l photo 1', 0),
  (7, '/uploads/products/digital-air-fryer-55l-2.jpg', 'digital air fryer 55l photo 2', 1),
  (8, '/uploads/products/smart-watch-fitness-tracker-1.jpg', 'smart watch fitness tracker photo 1', 0),
  (8, '/uploads/products/smart-watch-fitness-tracker-2.jpg', 'smart watch fitness tracker photo 2', 1),
  (9, '/uploads/products/slimfit-bed-mattress-queen-1.jpg', 'slimfit bed mattress queen photo 1', 0),
  (10, '/uploads/products/adjustable-dumbbell-set-20kg-1.jpg', 'adjustable dumbbell set 20kg photo 1', 0),
  (11, '/uploads/products/classic-analog-wrist-watch-1.jpg', 'classic analog wrist watch photo 1', 0),
  (12, '/uploads/products/wireless-over-ear-headphones-1.jpg', 'wireless over ear headphones photo 1', 0),
  (12, '/uploads/products/wireless-over-ear-headphones-2.jpg', 'wireless over ear headphones photo 2', 1),
  (13, '/uploads/products/cotton-panjabi-fatua-1.jpg', 'cotton panjabi fatua photo 1', 0),
  (14, '/uploads/products/non-stick-cookware-set-1.jpg', 'non stick cookware set photo 1', 0),
  (15, '/uploads/products/makeup-brush-set-12pc-1.jpg', 'makeup brush set 12pc photo 1', 0),
  (16, '/uploads/products/smart-led-bulb-pack-4-1.jpg', 'smart led bulb pack 4 photo 1', 0),
  (17, '/uploads/products/formal-leather-oxford-shoes-1.jpg', 'formal leather oxford shoes photo 1', 0),
  (18, '/uploads/products/elegant-leather-handbag-1.jpg', 'elegant leather handbag photo 1', 0),
  (19, '/uploads/products/foldable-camping-tent-1.jpg', 'foldable camping tent photo 1', 0),
  (20, '/uploads/products/budget-smartphone-x7-1.jpg', 'budget smartphone x7 photo 1', 0),
  (21, '/uploads/products/ergonomic-office-chair-1.jpg', 'ergonomic office chair photo 1', 0),
  (22, '/uploads/products/polarised-sunglasses-1.jpg', 'polarised sunglasses photo 1', 0),
  (23, '/uploads/products/anti-hairfall-shampoo-400ml-1.jpg', 'anti hairfall shampoo 400ml photo 1', 0),
  (24, '/uploads/products/minimalist-desk-organiser-1.jpg', 'minimalist desk organiser photo 1', 0),
  (25, '/uploads/products/portable-bluetooth-speaker-1.jpg', 'portable bluetooth speaker photo 1', 0),
  (26, '/uploads/products/oxford-slim-fit-shirt-1.jpg', 'oxford slim fit shirt photo 1', 0),
  (27, '/uploads/products/knit-running-sneakers-1.jpg', 'knit running sneakers photo 1', 0),
  (28, '/uploads/products/cotton-bedsheet-set-king-1.jpg', 'cotton bedsheet set king photo 1', 0),
  (29, '/uploads/products/stainless-steel-water-bottle-1.jpg', 'stainless steel water bottle photo 1', 0),
  (30, '/uploads/products/yoga-mat-with-carry-strap-1.png', 'yoga mat with carry strap photo 1', 0);

-- ----------------------------------------------------------------------------
-- Product specifications
-- ----------------------------------------------------------------------------
INSERT INTO `product_specs` (`product_id`, `spec_key`, `spec_value`, `sort_order`) VALUES
  (1,  'Display',        '6.6" Super AMOLED, 120Hz',      0),
  (1,  'Processor',      'Exynos 1480',                  1),
  (1,  'RAM / Storage',  '8GB / 128GB',                  2),
  (1,  'Camera',         '50MP + 12MP + 5MP',            3),
  (1,  'Battery',        '5000mAh',                      4),
  (1,  'Water Resistance','IP67',                        5),
  (2,  'Processor',      'Intel Core i5 12th Gen',        0),
  (2,  'RAM / Storage',  '16GB DDR4 / 512GB NVMe SSD',   1),
  (2,  'Display',        '15.6" Full HD IPS',            2),
  (2,  'Graphics',       'Intel Iris Xe',                3),
  (2,  'Weight',         '1.72 kg',                      4),
  (3,  'Material',       '100% combed cotton',           0),
  (3,  'Fit',            'Regular',                      1),
  (3,  'Care',           'Machine wash cold',            2),
  (4,  'Key ingredient', '10% Vitamin C + Hyaluronic Acid',0),
  (4,  'Volume',         '30ml',                         1),
  (4,  'Skin type',      'All skin types',               2),
  (5,  'Upper',          'Engineered mesh',              0),
  (5,  'Sole',           'EVA foam with rubber outsole',  1),
  (5,  'Size range',     'EU 38 - EU 45',                2),
  (6,  'Capacity',       '30 litres',                    0),
  (6,  'Laptop sleeve',  'Up to 16 inches',              1),
  (6,  'Material',       'Water-resistant polyester',    2),
  (7,  'Capacity',       '5.5 litres',                   0),
  (7,  'Power',          '1500W',                        1),
  (7,  'Presets',        '8 cooking modes',              2),
  (8,  'Display',        '1.83" AMOLED',                 0),
  (8,  'Battery life',   'Up to 14 days',                1),
  (8,  'Sensors',        'Heart rate, SpO2, sleep',      2),
  (9,  'Size',           'Queen (78" x 60")',            0),
  (9,  'Spring type',    '7-zone pocket spring',         1),
  (9,  'Warranty',       '10 years',                     2),
  (10, 'Weight range',   '2kg - 20kg per dumbbell',      0),
  (10,'Plate count',     '6 pairs',                      1),
  (11, 'Case size',      '40mm stainless steel',         0),
  (11, 'Movement',       'Japanese quartz',              1),
  (11, 'Strap',          'Genuine leather',              2),
  (12, 'Drivers',        '40mm',                         0),
  (12, 'Battery life',   '35 hours (ANC off)',           1),
  (12, 'Connectivity',   'Bluetooth 5.3, multipoint',    2),
  (14, 'Pieces',         '7',                            0),
  (14, 'Coating',        'Granite non-stick',            1),
  (14, 'Base',           'Induction compatible',         2),
  (15, 'Pieces',         '12',                           0),
  (15, 'Bristles',       'Vegan synthetic fibre',        1),
  (16, 'Fitting',        'E27',                          0),
  (16, 'Colours',        '16 million',                   1),
  (18, 'Material',       'Pebbled leather',              0),
  (18, 'Dimensions',     '28 x 20 x 12 cm',              1),
  (19, 'Capacity',       '2 persons',                    0),
  (19, 'Waterproof',     '3000mm fly',                   1),
  (20, 'Display',        '6.5" HD+ 90Hz',                0),
  (20, 'Battery',        '5000mAh',                      1),
  (21, 'Load capacity',  'Up to 120 kg',                 0),
  (21, 'Armrests',       '4D adjustable',                1),
  (23, 'Volume',         '400ml',                        0),
  (23, 'Key ingredients','Caffeine, biotin, amino acids', 1),
  (25, 'Output',         '20W stereo',                   0),
  (25, 'Waterproof',     'IPX7',                         1),
  (28, 'Thread count',   '300 TC',                       0),
  (28, 'Set includes',   '1 bedsheet + 2 pillow covers',  1),
  (29, 'Capacity',       '750ml',                        0),
  (29, 'Insulation',     '24h cold / 12h hot',           1),
  (30, 'Thickness',      '6mm',                          0),
  (30, 'Material',       'TPE, non-slip',                1);

-- ----------------------------------------------------------------------------
-- Banners
-- ----------------------------------------------------------------------------
INSERT INTO `banners` (`id`, `title`, `subtitle`, `image_url`, `mobile_image_url`, `button_text`, `button_link`, `theme`, `status`, `sort_order`) VALUES
  (1, 'The Monsoon Edit',      'Up to 40% off on clothing, shoes and bags', '/uploads/banners/banner-1.jpg', '/uploads/banners/banner-1.jpg', 'Shop the sale', '/offers',        'default', 'active',   1),
  (2, 'Tech Week',             'Smartphones, audio and gadgets from ৳999',   '/uploads/banners/banner-2.jpg', '/uploads/banners/banner-2.jpg', 'Explore tech', '/category/electronics', 'dark',  'active',   2),
  (3, 'New Arrivals',          'Fresh drops added every week',              '/uploads/banners/banner-3.jpg', '/uploads/banners/banner-3.jpg', 'See what is new', '/shop?sort=newest', 'light', 'active',   3),
  (4, 'Free Delivery Inside Dhaka', 'On every order above ৳5,000',          '/uploads/banners/banner-4.jpg', '/uploads/banners/banner-4.jpg', 'Start shopping', '/shop',    'default', 'inactive', 4);

-- ----------------------------------------------------------------------------
-- Coupons
-- ----------------------------------------------------------------------------
INSERT INTO `coupons` (`id`, `code`, `description`, `discount_type`, `discount_value`, `minimum_order`, `maximum_discount`, `start_date`, `expiry_date`, `usage_limit`, `per_user_limit`, `used_count`, `status`) VALUES
  (1, 'ESHOP10',   '10% off your first order',        'percent', 10.00, 1000.00, 500.00,  '2026-01-01 00:00:00', '2027-12-31 23:59:59', 500, 1, 0, 'active'),
  (2, 'SAVE200',   'Flat ৳200 off orders over ৳3,000', 'fixed',   200.00, 3000.00, 200.00,  '2026-01-01 00:00:00', '2027-12-31 23:59:59', 300, 1, 0, 'active'),
  (3, 'MEGA25',    '25% off, maximum ৳1,500 off',      'percent', 25.00, 5000.00, 1500.00, '2026-01-01 00:00:00', '2027-12-31 23:59:59', 100, 1, 0, 'active'),
  (4, 'FREESHIP',  'Free delivery voucher',            'fixed',   60.00,  0.00,   60.00,   '2026-01-01 00:00:00', '2027-12-31 23:59:59', 1000, 3, 0, 'active'),
  (5, 'EID50',     'Eid special, 50% off',            'percent', 50.00, 8000.00, 4000.00, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 50,  1, 0, 'inactive'),
  (6, 'EXPIRED20', 'Expired coupon for testing',       'percent', 20.00, 0.00,   NULL,    '2020-01-01 00:00:00', '2020-12-31 23:59:59', NULL, 1, 0, 'active');

-- ----------------------------------------------------------------------------
-- Orders  (spread over the year so the analytics charts have real data)
-- ----------------------------------------------------------------------------
INSERT INTO `orders`
  (`id`, `order_number`, `user_id`, `customer_name`, `customer_phone`, `customer_email`, `customer_address`,
   `city`, `area`, `delivery_zone`, `notes`, `subtotal`, `discount`, `coupon_id`, `coupon_code`,
   `delivery_fee`, `total`, `payment_method`, `payment_status`, `order_status`, `created_at`) VALUES
  (1,  'ESH-2026-000001', 1, 'Ayesha Rahman',  '01712345678', 'ayesha@example.com',  'House 12, Road 5, Banani',   'Dhaka',     'Banani',     'inside_dhaka',  'Please call before delivery', 37102.50,  0.00,  NULL, NULL,   0.00,  37102.50, 'cod', 'paid',    'delivered', '2026-01-14 11:20:00'),
  (2,  'ESH-2026-000002', 2, 'Rakib Hasan',    '01812345678', 'rakib@example.com',   'Flat B3, Mirpur DOHS',       'Dhaka',     'Mirpur',     'inside_dhaka',  NULL,                     7490.00,   749.00, 1,   'ESHOP10', 0.00, 6741.00,  'cod', 'paid',    'delivered', '2026-02-05 16:45:00'),
  (3,  'ESH-2026-000003', 3, 'Nusrat Jahan',   '01912345678', 'nusrat@example.com',  'House 7, Zindabazar',        'Dhaka',     'Zindabazar', 'inside_dhaka',  'Gift wrap please',           1827.50,   0.00,  NULL, NULL,   60.00, 1887.50,  'cod', 'paid',    'delivered', '2026-02-22 10:10:00'),
  (4,  'ESH-2026-000004', 4, 'Tanvir Ahmed',   '01612345678', 'tanvir@example.com',  'House 44, Agrabad C/A',      'Chattogram','Agrabad',    'outside_dhaka', 'Deliver to office',          2080.00,   0.00,  NULL, NULL,   120.00,2200.00, 'cod', 'paid',    'delivered', '2026-03-10 09:30:00'),
  (5,  'ESH-2026-000005', 5, 'Sadia Islam',    '01512345678', 'sadia@example.com',   'House 21, Shahjalal Road',   'Sylhet',    'Shahjalal',  'outside_dhaka', NULL,                     8446.00,   0.00,  NULL, NULL,   120.00,8566.00, 'cod', 'paid',    'delivered', '2026-03-27 14:00:00'),
  (6,  'ESH-2026-000006', 2, 'Rakib Hasan',    '01812345678', 'rakib@example.com',   'Flat B3, Mirpur DOHS',       'Dhaka',     'Mirpur',     'inside_dhaka',  NULL,                     13872.00,  0.00,  NULL, NULL,   0.00,  13872.00, 'cod', 'paid',    'delivered', '2026-04-14 12:25:00'),
  (7,  'ESH-2026-000007', 3, 'Nusrat Jahan',   '01912345678', 'nusrat@example.com',  'House 7, Zindabazar',        'Dhaka',     'Zindabazar', 'inside_dhaka',  NULL,                     1030.00,   0.00,  NULL, NULL,   60.00,  1090.00,  'cod', 'paid',    'cancelled', '2026-04-19 18:40:00'),
  (8,  'ESH-2026-000008', 7, 'Mehedi Hasan',   '01312345678', 'mehedi@example.com',  'House 9, Rajshahi Cant.',    'Rajshahi',  'Cantonment', 'outside_dhaka', 'Cash on delivery',          5760.00,   0.00,  NULL, NULL,   120.00,5880.00, 'cod', 'paid',    'delivered', '2026-05-09 08:15:00'),
  (9,  'ESH-2026-000009', 1, 'Ayesha Rahman',  '01712345678', 'ayesha@example.com',  'House 12, Road 5, Banani',   'Dhaka',     'Banani',     'inside_dhaka',  NULL,                     15152.00,  1515.20, 3,  'MEGA25',   0.00, 13636.80, 'cod', 'paid',   'shipped',   '2026-06-02 13:55:00'),
  (10, 'ESH-2026-000010', 8, 'Farhana Akter',  '01212345678', 'farhana@example.com', 'House 18, Khulna Sadar',    'Khulna',    'Sadar',      'outside_dhaka', NULL,                     2916.00,   0.00,  NULL, NULL,   120.00,3036.00, 'cod', 'pending','delivered', '2026-06-08 15:20:00'),
  (11, 'ESH-2026-000011', 2, 'Rakib Hasan',    '01812345678', 'rakib@example.com',   'Flat B3, Mirpur DOHS',       'Dhaka',     'Mirpur',     'inside_dhaka',  'Call after 5pm',             8207.00,   0.00,  NULL, NULL,   60.00,  8267.00,  'cod', 'pending','processing','2026-06-15 10:05:00'),
  (12, 'ESH-2026-000012', 4, 'Tanvir Ahmed',   '01612345678', 'tanvir@example.com',  'House 44, Agrabad C/A',      'Chattogram','Agrabad',    'outside_dhaka', NULL,                     19980.00,  0.00,  NULL, NULL,   120.00,20100.00,'cod', 'pending','confirmed', '2026-06-18 17:45:00'),
  (13, 'ESH-2026-000013', 3, 'Nusrat Jahan',   '01912345678', 'nusrat@example.com',  'House 7, Zindabazar',        'Dhaka',     'Zindabazar', 'inside_dhaka',  'Need an invoice',            3626.00,   0.00,  NULL, NULL,   60.00,  3686.00,  'cod', 'pending','pending',   '2026-06-20 09:30:00'),
  (14, 'ESH-2026-000014', 5, 'Sadia Islam',    '01512345678', 'sadia@example.com',   'House 21, Shahjalal Road',   'Sylhet',    'Shahjalal',  'outside_dhaka', NULL,                     1575.00,   0.00,  NULL, NULL,   120.00,1695.00, 'cod', 'pending','pending',   '2026-06-21 11:10:00'),
  (15, 'ESH-2026-000015', 1, 'Ayesha Rahman',  '01712345678', 'ayesha@example.com',  'House 12, Road 5, Banani',   'Dhaka',     'Banani',     'inside_dhaka',  NULL,                     1000.00,   0.00,  NULL, NULL,   60.00,  1060.00,  'cod', 'pending','pending',   '2026-06-22 14:25:00');

-- ----------------------------------------------------------------------------
-- Order items  (product snapshot preserved)
-- ----------------------------------------------------------------------------
INSERT INTO `order_items`
  (`order_id`, `product_id`, `category_id`, `product_name`, `product_sku`, `product_image`,
   `quantity`, `original_price`, `discount`, `unit_price`, `total`) VALUES
  (1,  12, 2,  'Wireless Over-Ear Headphones',     'ESH-ELE-ANC01', '/uploads/products/wireless-over-ear-headphones-1.jpg', 1, 8900.00, 24.00, 6764.00, 6764.00),
  (1,  4,  4,  'Hydrating Vitamin C Serum',        'ESH-COS-VC10',  '/uploads/products/hydrating-vitamin-c-serum-1.jpg',  3, 1450.00, 30.00, 1015.00, 3045.00),
  (1,  3,  1,  'Premium Cotton Kurta',             'ESH-CLO-KUR01', '/uploads/products/premium-cotton-kurta-1.jpg',  20,1850.00, 25.00, 1387.50, 27750.00),
  (1,  23, 4,  'Anti-Hairfall Shampoo 400ml',      'ESH-COS-SH01',  '/uploads/products/anti-hairfall-shampoo-400ml-1.jpg', 16, 950.00, 20.00, 760.00, 12160.00),
  (2,  1,  2,  'Samsung Galaxy A55 5G',            'ESH-SAM-A55',   '/uploads/products/samsung-galaxy-a55-5g-1.jpg',  1, 49999.00,18.00,41019.00,41019.00),
  (2,  22, 10, 'Polarised Sunglasses',             'ESH-ACC-SG01',  '/uploads/products/polarised-sunglasses-1.jpg', 1, 2400.00, 25.00, 1800.00, 1800.00),
  (2,  25, 2,  'Portable Bluetooth Speaker',       'ESH-ELE-SP20',  '/uploads/products/portable-bluetooth-speaker-1.jpg', 1, 4200.00, 28.00, 3024.00, 3024.00),
  (2,  24, 12, 'Minimalist Desk Organiser',        'ESH-OTH-DO01',  '/uploads/products/minimalist-desk-organiser-1.jpg', 1, 1250.00, 20.00, 1000.00, 1000.00),
  (2,  29, 5,  'Stainless Steel Water Bottle',     'ESH-KIT-WB75',  '/uploads/products/stainless-steel-water-bottle-1.jpg', 1, 1450.00, 20.00, 1160.00, 1160.00),
  (2,  16, 3,  'Smart LED Bulb Pack (4)',          'ESH-GAD-BL04',  '/uploads/products/smart-led-bulb-pack-4-1.jpg', 1, 3600.00, 16.00, 3024.00, 3024.00),
  (3,  15, 11, 'Makeup Brush Set 12pc',            'ESH-BTY-BR12',  '/uploads/products/makeup-brush-set-12pc-1.jpg', 1, 2200.00, 30.00, 1540.00, 1540.00),
  (3,  23, 4,  'Anti-Hairfall Shampoo 400ml',      'ESH-COS-SH01',  '/uploads/products/anti-hairfall-shampoo-400ml-1.jpg', 1, 950.00, 20.00, 760.00, 760.00),
  (4,  6,  8,  'Laptop Backpack 30L',              'ESH-BAG-BP30',  '/uploads/products/laptop-backpack-30l-1.jpg',  1, 3200.00, 35.00, 2080.00, 2080.00),
  (5,  3,  1,  'Premium Cotton Kurta',             'ESH-CLO-KUR01', '/uploads/products/premium-cotton-kurta-1.jpg',  3, 1850.00, 25.00, 1387.50, 4162.50),
  (5,  23, 4,  'Anti-Hairfall Shampoo 400ml',      'ESH-COS-SH01',  '/uploads/products/anti-hairfall-shampoo-400ml-1.jpg', 3, 950.00, 20.00, 760.00, 2280.00),
  (5,  26, 1,  'Oxford Slim Fit Shirt',            'ESH-CLO-SH01',  '/uploads/products/oxford-slim-fit-shirt-1.jpg', 1, 1900.00, 22.00, 1482.00, 1482.00),
  (5,  29, 5,  'Stainless Steel Water Bottle',     'ESH-KIT-WB75',  '/uploads/products/stainless-steel-water-bottle-1.jpg', 1, 1450.00, 20.00, 1160.00, 1160.00),
  (5,  24, 12, 'Minimalist Desk Organiser',        'ESH-OTH-DO01',  '/uploads/products/minimalist-desk-organiser-1.jpg', 1, 1250.00, 20.00, 1000.00, 1000.00),
  (6,  1,  2,  'Samsung Galaxy A55 5G',            'ESH-SAM-A55',   '/uploads/products/samsung-galaxy-a55-5g-1.jpg',  1, 49999.00,18.00,41019.00,41019.00),
  (6,  13, 1,  'Cotton Panjabi (Fatua)',           'ESH-CLO-PJ01',  '/uploads/products/cotton-panjabi-fatua-1.jpg', 1, 2400.00, 20.00, 1920.00, 1920.00),
  (6,  20, 2,  'Budget Smartphone X7',              'ESH-SMA-X701',  '/uploads/products/budget-smartphone-x7-1.jpg', 1, 12999.00,22.00,10139.00,10139.00),
  (6,  11, 10, 'Classic Analog Wrist Watch',       'ESH-ACC-WT01',  '/uploads/products/classic-analog-wrist-watch-1.jpg', 1, 5500.00, 18.00, 4510.00, 4510.00),
  (7,  4,  4,  'Hydrating Vitamin C Serum',        'ESH-COS-VC10',  '/uploads/products/hydrating-vitamin-c-serum-1.jpg',  1, 1450.00, 30.00, 1015.00, 1015.00),
  (8,  5,  7,  'Urban Runner Sneakers',            'ESH-SHO-UR01',  '/uploads/products/urban-runner-sneakers-1.jpg',  1, 4200.00, 20.00, 3360.00, 3360.00),
  (8,  22, 10, 'Polarised Sunglasses',             'ESH-ACC-SG01',  '/uploads/products/polarised-sunglasses-1.jpg', 1, 2400.00, 25.00, 1800.00, 1800.00),
  (8,  24, 12, 'Minimalist Desk Organiser',        'ESH-OTH-DO01',  '/uploads/products/minimalist-desk-organiser-1.jpg', 1, 1250.00, 20.00, 1000.00, 1000.00),
  (8,  24, 12, 'Minimalist Desk Organiser',        'ESH-OTH-DO01',  '/uploads/products/minimalist-desk-organiser-1.jpg', 1, 1250.00, 20.00, 1000.00, 1000.00),
  (9,  7,  5,  'Digital Air Fryer 5.5L',           'ESH-KIT-AF55',  '/uploads/products/digital-air-fryer-55l-1.jpg',  1, 6500.00, 22.00, 5070.00, 5070.00),
  (9,  14, 5,  'Non-Stick Cookware Set',           'ESH-KIT-CP07',  '/uploads/products/non-stick-cookware-set-1.jpg', 1, 8900.00, 32.00, 6052.00, 6052.00),
  (9,  2,  2,  'HP Pavilion 15 Laptop',            'ESH-HP-PV15',   '/uploads/products/hp-pavilion-15-laptop-1.jpg',  1, 72500.00,12.00,63800.00,63800.00),
  (9,  18, 8,  'Elegant Leather Handbag',          'ESH-BAG-HB01',  '/uploads/products/elegant-leather-handbag-1.jpg', 1, 4900.00, 26.00, 3626.00, 3626.00),
  (10, 22, 10, 'Polarised Sunglasses',             'ESH-ACC-SG01',  '/uploads/products/polarised-sunglasses-1.jpg', 1, 2400.00, 25.00, 1800.00, 1800.00),
  (10, 29, 5,  'Stainless Steel Water Bottle',     'ESH-KIT-WB75',  '/uploads/products/stainless-steel-water-bottle-1.jpg', 1, 1450.00, 20.00, 1160.00, 1160.00),
  (10, 23, 4,  'Anti-Hairfall Shampoo 400ml',      'ESH-COS-SH01',  '/uploads/products/anti-hairfall-shampoo-400ml-1.jpg', 1, 950.00, 20.00, 760.00, 760.00),
  (11, 2,  2,  'HP Pavilion 15 Laptop',            'ESH-HP-PV15',   '/uploads/products/hp-pavilion-15-laptop-1.jpg',  1, 72500.00,12.00,63800.00,63800.00),
  (11, 8,  3,  'Smart Watch Fitness Tracker',      'ESH-GAD-SW01',  '/uploads/products/smart-watch-fitness-tracker-1.jpg',  1, 3800.00, 28.00, 2736.00, 2736.00),
  (11, 17, 7,  'Formal Leather Oxford Shoes',       'ESH-SHO-OX01',  '/uploads/products/formal-leather-oxford-shoes-1.jpg', 1, 6900.00, 20.00, 5520.00, 5520.00),
  (11, 19, 9,  'Foldable Camping Tent',            'ESH-SPT-TN02',  '/uploads/products/foldable-camping-tent-1.jpg', 1,11500.00, 18.00, 9430.00, 9430.00),
  (11, 30, 9,  'Yoga Mat with Carry Strap',         'ESH-SPT-YM01',  '/uploads/products/yoga-mat-with-carry-strap-1.png', 1, 2100.00, 25.00, 1575.00, 1575.00),
  (11, 24, 12, 'Minimalist Desk Organiser',        'ESH-OTH-DO01',  '/uploads/products/minimalist-desk-organiser-1.jpg', 1, 1250.00, 20.00, 1000.00, 1000.00),
  (11, 10, 9,  'Adjustable Dumbbell Set 20kg',     'ESH-SPT-DB20',  '/uploads/products/adjustable-dumbbell-set-20kg-1.jpg', 1, 7800.00, 20.00, 6240.00, 6240.00),
  (12, 1,  2,  'Samsung Galaxy A55 5G',            'ESH-SAM-A55',   '/uploads/products/samsung-galaxy-a55-5g-1.jpg',  1, 49999.00,18.00,41019.00,41019.00),
  (12, 21, 6,  'Ergonomic Office Chair',           'ESH-HOM-CH01',  '/uploads/products/ergonomic-office-chair-1.jpg', 1,13500.00, 15.00,11475.00,11475.00),
  (13, 18, 8,  'Elegant Leather Handbag',          'ESH-BAG-HB01',  '/uploads/products/elegant-leather-handbag-1.jpg', 1, 4900.00, 26.00, 3626.00, 3626.00),
  (14, 30, 9,  'Yoga Mat with Carry Strap',         'ESH-SPT-YM01',  '/uploads/products/yoga-mat-with-carry-strap-1.png', 1, 2100.00, 25.00, 1575.00, 1575.00),
  (15, 24, 12, 'Minimalist Desk Organiser',        'ESH-OTH-DO01',  '/uploads/products/minimalist-desk-organiser-1.jpg', 1, 1250.00, 20.00, 1000.00, 1000.00);

-- ----------------------------------------------------------------------------
-- Reviews  (only from customers who appear in the matching order)
-- ----------------------------------------------------------------------------
INSERT INTO `reviews` (`product_id`, `user_id`, `order_id`, `rating`, `review`, `status`, `created_at`) VALUES
  (1,  2,  2,  5, 'Excellent phone for the price. Battery lasts a full day and the camera is genuinely good in low light.', 'visible', '2026-02-06 12:00:00'),
  (1,  1,  9,  4, 'Very happy overall. Only small complaint is that the charger is not included in the box.',                  'visible', '2026-06-03 09:20:00'),
  (1,  4,  12, 5, 'Bought this for my father and he is very satisfied. Delivery took two days.',                              'visible', '2026-06-19 14:40:00'),
  (12, 1,  1,  5, 'The noise cancelling is superb on the metro. 35 hour battery is accurate too.',                              'visible', '2026-01-15 10:30:00'),
  (12, 2,  11, 4, 'Great sound, comfortable for long sessions. Multipoint pairing is a nice touch.',                            'visible', '2026-06-16 11:00:00'),
  (3,  1,  1,  4, 'Soft cotton and the colour is exactly as pictured. Bought three more.',                                       'visible', '2026-01-15 10:45:00'),
  (3,  3,  3,  5, 'My go-to kurta. Holds its shape after many washes now.',                                                     'visible', '2026-02-23 16:20:00'),
  (3,  5,  5,  4, 'Nice fabric, slightly smaller than expected so size up if you are between sizes.',                            'visible', '2026-03-28 12:00:00'),
  (4,  1,  1,  5, 'Skin looks noticeably brighter after three weeks of daily use.',                                                'visible', '2026-01-16 09:00:00'),
  (4,  3,  7,  3, 'Fine product but it stung a little at first for me. Give it a week to get used to it.',                        'visible', '2026-04-20 15:30:00'),
  (5,  7,  8,  5, 'Very comfortable for daily walking. Ran 10km in them without any foot pain.',                                   'visible', '2026-05-10 08:40:00'),
  (6,  4,  4,  4, 'Sturdy build and the laptop compartment fits my 15 inch laptop snugly.',                                        'visible', '2026-03-11 13:15:00'),
  (7,  2,  11, 5, 'Makes crisp fries in 18 minutes. Basket is easy to clean and the presets actually work.',                        'visible', '2026-06-16 18:00:00'),
  (8,  2,  11, 4, 'Great battery life as advertised. The app took a couple of updates to work properly.',                           'visible', '2026-06-17 09:50:00'),
  (14, 2,  6,  5, 'Excellent set, works on induction and nothing sticks at all.',                                                    'visible', '2026-04-15 11:20:00'),
  (20, 2,  6,  4, 'Good value for a backup phone. Camera is decent in daylight.',                                                   'visible', '2026-04-15 11:30:00'),
  (23, 1,  1,  5, 'Hair fall has reduced a lot. No more sulphates, no more smell.',                                                  'visible', '2026-01-17 08:15:00'),
  (23, 3,  3,  4, 'Works well but you need to use it consistently to see results.',                                                 'visible', '2026-02-24 10:20:00'),
  (2,  2,  11, 4, 'Solid laptop for university work. Fan is quiet under normal load.',                                             'visible', '2026-06-17 20:00:00'),
  (9,  4,  12, 5, 'Best sleep I have had in years. Delivery team brought it upstairs too.',                                        'visible', '2026-06-19 09:00:00'),
  (11, 4,  6, 4, 'Looks more expensive than it is. Strap is soft and the movement is accurate.',                                   'visible', '2026-04-16 14:00:00'),
  (18, 3,  13, 5, 'Beautiful bag, the leather feels premium. Comes with plenty of inside pockets.',                                 'visible', '2026-06-21 09:40:00'),
  (15, 1,  15, 4, 'Soft brushes and no shedding. The travel roll is a nice bonus.',                                                'visible', '2026-06-23 12:30:00'),
  (24, 1,  15, 5, 'Small but well made. The bamboo looks great on my desk.',                                                       'visible', '2026-06-23 12:40:00'),
  (30, 5,  14, 4, 'Good grip even when sweating. Slightly thicker than I expected which is good for knees.',                        'visible', '2026-06-22 15:00:00'),
  (13, 2,  6, 5, 'Perfect for Eid. The embroidery is neat and the cotton is breathable.',                                           'visible', '2026-04-16 16:00:00'),
  (16, 2,  2,  3, 'Works with Alexa but the app is a bit clunky. Colours are great though.',                                         'visible', '2026-02-07 10:00:00'),
  (27, 1,  1,  4, 'Confirmed out of stock when I wanted them, hoping restock soon. Wishlist is working nicely for me though.',      'visible', '2026-01-18 11:00:00'),
  (25, 2,  2,  5, 'Loud enough for outdoor use and survived a splash of water. Battery is honest.',                                'visible', '2026-02-07 11:00:00'),
  (22, 1,  9,  4, 'Good polarisation, cuts glare well while driving. Case is a bit bulky.',                                          'visible', '2026-06-04 10:00:00'),
  (17, 2,  11, 4, 'Comfortable from the first wear. Broke in quickly and looks smart with a suit.',                                'visible', '2026-06-18 12:00:00'),
  (19, 2,  11, 5, 'Packed in under a minute, exactly as advertised. Held up well in a recent trip.',                                 'visible', '2026-06-18 13:00:00'),
  (10, 2,  11, 4, 'Great for a small home gym, saves a lot of floor space compared to loose plates.',                                'visible', '2026-06-18 14:00:00'),
  (21, 4,  12, 5, 'My back pain improved within a month of using this chair. Worth every taka.',                                     'visible', '2026-06-20 10:00:00'),
  (26, 5,  5,  4, 'Wrinkle resistant is not an exaggeration, wore it on a 10 hour trip and it looked fine.',                         'visible', '2026-03-29 10:00:00'),
  (28, 7,  8,  4, 'Nice jacquard pattern and it has not faded after several washes.',                                              'visible', '2026-05-11 10:00:00'),
  (29, 3,  13, 5, 'Keeps water cold all day. The lid does not leak in my bag.',                                                     'visible', '2026-06-21 10:00:00'),
  (5,  1,  9,  4, 'Comfortable and light. Sizes run slightly small, size up if you are between sizes.',                             'visible', '2026-06-05 10:00:00'),
  (29, 2,  2,  5, 'Stainless steel keeps water cold all day and the lid has never leaked in my bag.',                                'visible', '2026-02-07 12:00:00'),
  (6,  3,  3,  5, 'Water resistant indeed, survived a monsoon walk. Very comfortable on long days.',                                'visible', '2026-02-24 12:00:00'),
  (12, 4,  12, 5, 'Best purchase this year. The ANC is comparable to much more expensive brands.',                                  'visible', '2026-06-20 10:30:00');

-- ----------------------------------------------------------------------------
-- Conversations + messages
-- ----------------------------------------------------------------------------
INSERT INTO `conversations` (`id`, `user_id`, `status`, `last_message`, `last_message_at`, `unread_admin`, `unread_user`, `created_at`) VALUES
  (1, 1, 'open',   'Perfect, thank you so much!',        '2026-06-19 16:30:00', 0, 0, '2026-06-19 15:40:00'),
  (2, 2, 'open',   'Is the laptop under warranty?',      '2026-06-20 09:15:00', 1, 0, '2026-06-18 10:00:00'),
  (3, 4, 'closed', 'Thanks, that resolved it.',          '2026-06-12 11:00:00', 0, 0, '2026-06-10 12:00:00');

INSERT INTO `messages` (`conversation_id`, `sender_id`, `sender_role`, `message`, `is_read`, `created_at`) VALUES
  (1, 1, 'customer', 'Assalamu Alaikum. My Galaxy A55 order is marked delivered but I have not received it yet. Could you check?', 1, '2026-06-19 15:40:00'),
  (1, NULL, 'admin',  'Assalamu Alaikum! Sorry about that. I can see the rider marked it delivered. I will call you within 10 minutes to sort this out.', 1, '2026-06-19 15:55:00'),
  (1, 1, 'customer', 'Thank you for the quick reply.', 1, '2026-06-19 16:20:00'),
  (1, 1, 'customer', 'Perfect, thank you so much!',   1, '2026-06-19 16:30:00'),
  (2, 2, 'customer', 'Assalamu Alaikum. I ordered the HP Pavilion laptop. Is it covered by warranty?', 0, '2026-06-18 10:00:00'),
  (2, NULL, 'admin',  'Assalamu Alaikum! Yes, it comes with a 1 year international warranty. The invoice is in your order details.', 0, '2026-06-18 10:20:00'),
  (2, 2, 'customer', 'Is the laptop under warranty?',  0, '2026-06-20 09:15:00'),
  (3, 4, 'customer', 'Can I change my delivery address for order ESH-2026-000004?', 1, '2026-06-10 12:00:00'),
  (3, NULL, 'admin',  'Yes, as long as it has not been shipped. I have updated the address to House 44, Agrabad C/A for you.', 1, '2026-06-10 12:15:00'),
  (3, 4, 'customer', 'Thanks, that resolved it.',    1, '2026-06-12 11:00:00');

-- ----------------------------------------------------------------------------
-- Notifications
-- ----------------------------------------------------------------------------
INSERT INTO `notifications` (`user_id`, `title`, `message`, `type`, `link`, `is_read`, `created_at`) VALUES
  (1, 'Your order is confirmed',   'Order ESH-2026-000009 has been confirmed and will be packed shortly.', 'order', '/profile/orders/9', 1, '2026-06-02 14:00:00'),
  (1, 'Your order has been shipped','Your parcel is on the way. Expected delivery within 2 days.',          'order', '/profile/orders/9', 0, '2026-06-19 10:00:00'),
  (1, 'Support replied to your message', 'Our team has replied to your delivery enquiry.',                'chat',  '/profile/chat',    0, '2026-06-19 15:55:00'),
  (1, 'Order delivered',           'Enjoy your order ESH-2026-000001. We would love a review.',             'order', '/profile/orders/1', 1, '2026-01-18 12:00:00'),
  (2, 'Your order is being processed','Order ESH-2026-000011 is being prepared for dispatch.',               'order', '/profile/orders/11',0, '2026-06-15 11:00:00'),
  (9, 'Low stock: Digital Air Fryer 5.5L', 'Only 18 unit(s) left in stock.',                              'low_stock', '/admin/products', 0, '2026-06-14 13:05:00'),
  (3, 'Order placed successfully',  'We received your order ESH-2026-000013. We will call you to confirm.',  'order', '/profile/orders',  1, '2026-06-20 09:31:00'),
  (3, 'Your account is active',    'Welcome to EShopping. Start exploring our latest arrivals.',          'general','/shop',           1, '2026-02-20 09:10:00'),
  (4, 'Your order is confirmed',   'Order ESH-2026-000012 has been confirmed.',                            'order', '/profile/orders/12',0, '2026-06-18 18:00:00'),
  (9, 'New customer message',      'Nusrat Jahan: Need an invoice',                                       'chat',  '/admin/messages',  0, '2026-06-20 09:31:00'),
  (9, 'New order received',        'ESH-2026-000014 from Sadia Islam - ৳1,695.00',                       'order', '/admin/orders/14', 0, '2026-06-21 11:11:00'),
  (9, 'New product review',        'Sadia Islam reviewed "Premium Cotton Kurta" (4/5)',                  'review','/admin/reviews',   0, '2026-03-28 12:01:00'),
  (9, 'New customer registered',   'Farhana Akter (01212345678) just created an account.',               'customer','/admin/customers',0, '2026-05-06 16:01:00'),
  (9, 'New order received',        'ESH-2026-000001 from Ayesha Rahman - ৳37,102.50',                     'order', '/admin/orders/1',  1, '2026-01-14 11:21:00');

-- ----------------------------------------------------------------------------
-- Admin activity log
-- ----------------------------------------------------------------------------
INSERT INTO `admin_activity_logs` (`admin_id`, `admin_name`, `action`, `description`, `created_at`) VALUES
  (9, 'IH Safy', 'product_created', 'Created product "Samsung Galaxy A55 5G"',              '2026-06-01 10:05:00'),
  (9, 'IH Safy', 'product_updated', 'Updated product "Samsung Galaxy A55 5G"',              '2026-06-03 09:00:00'),
  (9, 'IH Safy', 'order_status',     'ESH-2026-000009: pending -> shipped',                 '2026-06-19 10:00:00'),
  (9, 'IH Safy', 'order_status',     'ESH-2026-000012: pending -> confirmed',               '2026-06-18 18:00:00'),
  (9, 'IH Safy', 'order_status',     'ESH-2026-000011: confirmed -> processing',            '2026-06-16 09:00:00'),
  (9, 'IH Safy', 'order_status',     'ESH-2026-000007: pending -> cancelled',               '2026-04-20 15:30:00'),
  (9, 'IH Safy', 'banner_created',   'Created banner "The Monsoon Edit"',                   '2026-05-28 11:00:00'),
  (9, 'IH Safy', 'banner_created',   'Created banner "Tech Week"',                          '2026-06-06 12:20:00'),
  (9, 'IH Safy', 'banner_updated',   'Updated banner "New Arrivals"',                       '2026-06-10 09:15:00'),
  (9, 'IH Safy', 'category_created', 'Created category "Home & Living"',                   '2026-04-22 10:00:00'),
  (9, 'IH Safy', 'category_updated', 'Updated category "Accessories"',                      '2026-05-11 14:00:00'),
  (9, 'IH Safy', 'coupon_created',   'Created coupon "MEGA25"',                             '2026-05-01 09:00:00'),
  (9, 'IH Safy', 'coupon_updated',   'Updated coupon "ESHOP10"',                            '2026-06-01 08:45:00'),
  (9, 'IH Safy', 'customer_status',  'Imran Kabir account disabled',                       '2026-05-05 16:30:00'),
  (9, 'IH Safy', 'review_moderated', 'Review #14 set to hidden',                            '2026-05-20 10:30:00'),
  (9, 'IH Safy', 'product_deleted',  'Deleted product "Discontinued Sample Item"',           '2026-05-18 12:00:00'),
  (9, 'IH Safy', 'settings_updated', 'Updated settings: inside_dhaka_fee, outside_dhaka_fee','2026-06-05 09:30:00'),
  (9, 'IH Safy', 'product_updated',  'Updated product "Digital Air Fryer 5.5L"',            '2026-06-14 13:00:00'),
  (9, 'IH Safy', 'order_status',     'ESH-2026-000013: pending -> pending',                 '2026-06-20 09:35:00'),
  (9, 'IH Safy', 'order_status',     'ESH-2026-000014: pending -> pending',                 '2026-06-21 11:15:00'),
  (9, 'IH Safy', 'product_created',  'Created product "Cotton Panjabi (Fatua)"',            '2026-06-02 10:25:00'),
  (9, 'IH Safy', 'order_updated',    'Edited order ESH-2026-000010',                        '2026-06-09 09:00:00'),
  (9, 'IH Safy', 'category_created', 'Created subcategory "Smart Home"',                    '2026-05-02 11:30:00');

-- ----------------------------------------------------------------------------
-- Keep product rating aggregates in sync with the seeded reviews
-- ----------------------------------------------------------------------------
UPDATE `products` p
SET p.rating_avg = (
      SELECT ROUND(AVG(r.rating), 2) FROM `reviews` r
      WHERE r.product_id = p.id AND r.status = 'visible'
    ),
    p.rating_count = (
      SELECT COUNT(*) FROM `reviews` r
      WHERE r.product_id = p.id AND r.status = 'visible'
    );

-- ----------------------------------------------------------------------------
-- Rebuild sold_count from real order lines so the "Popular" sort works
-- ----------------------------------------------------------------------------
UPDATE `products` SET `sold_count` = 0;

UPDATE `products` p
SET p.sold_count = (
  SELECT COALESCE(SUM(oi.quantity), 0)
  FROM `order_items` oi
  JOIN `orders` o ON o.id = oi.order_id
  WHERE oi.product_id = p.id
    AND o.order_status IN ('confirmed', 'processing', 'shipped', 'delivered')
);

-- ----------------------------------------------------------------------------
-- Coupon usage trail
-- ----------------------------------------------------------------------------
INSERT INTO `coupon_usage` (`coupon_id`, `user_id`, `order_id`, `amount`, `created_at`) VALUES
  (1, 2,  2,  749.00,  '2026-02-05 16:45:00'),
  (3, 1,  9,  1515.20, '2026-06-02 13:55:00');

UPDATE `coupons` SET `used_count` = 1 WHERE `id` IN (1, 3);
