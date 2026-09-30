-- ============================================================================
--  EShopping - MySQL / MariaDB schema
--  Single-vendor e-commerce platform
--  Engine: InnoDB   Charset: utf8mb4
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `eshopping`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `eshopping`;

DROP TABLE IF EXISTS `admin_activity_logs`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `conversations`;
DROP TABLE IF EXISTS `coupon_usage`;
DROP TABLE IF EXISTS `coupons`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `wishlists`;
DROP TABLE IF EXISTS `cart_items`;
DROP TABLE IF EXISTS `carts`;
DROP TABLE IF EXISTS `product_images`;
DROP TABLE IF EXISTS `product_specs`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `subcategories`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `banners`;
DROP TABLE IF EXISTS `store_settings`;

-- ----------------------------------------------------------------------------
-- users  (customers + admins share one table, separated by `role`)
-- ----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(120)  NOT NULL,
  `mobile`        VARCHAR(20)   NOT NULL,
  `email`         VARCHAR(160)  DEFAULT NULL,
  `password_hash` VARCHAR(255)  NOT NULL,
  `role`          ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  `status`        ENUM('active','disabled') NOT NULL DEFAULT 'active',
  `address`       VARCHAR(500)  DEFAULT NULL,
  `city`          VARCHAR(80)   DEFAULT NULL,
  `area`          VARCHAR(80)   DEFAULT NULL,
  `avatar`        VARCHAR(255)  DEFAULT NULL,
  `last_login_at` DATETIME      DEFAULT NULL,
  `created_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_mobile` (`mobile`),
  UNIQUE KEY `uq_users_email`  (`email`),
  KEY `idx_users_role`   (`role`),
  KEY `idx_users_status` (`status`),
  KEY `idx_users_created`(`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- categories
-- ----------------------------------------------------------------------------
CREATE TABLE `categories` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(120) NOT NULL,
  `slug`        VARCHAR(140) NOT NULL,
  `description` TEXT         DEFAULT NULL,
  `icon`        VARCHAR(80)  DEFAULT NULL,
  `image_url`   VARCHAR(255) DEFAULT NULL,
  `status`      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `sort_order`  INT NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  KEY `idx_categories_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- subcategories
-- ----------------------------------------------------------------------------
CREATE TABLE `subcategories` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id` INT UNSIGNED NOT NULL,
  `name`        VARCHAR(120) NOT NULL,
  `slug`        VARCHAR(140) NOT NULL,
  `status`      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_subcat_slug` (`slug`),
  KEY `idx_subcat_category` (`category_id`),
  CONSTRAINT `fk_subcat_category` FOREIGN KEY (`category_id`)
    REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- products
--  sale_price is always derived from original_price + discount, but may be
--  manually overridden by an admin (sale_price_override flag).
-- ----------------------------------------------------------------------------
CREATE TABLE `products` (
  `id`                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_id`        INT UNSIGNED DEFAULT NULL,
  `subcategory_id`     INT UNSIGNED DEFAULT NULL,
  `name`               VARCHAR(200) NOT NULL,
  `slug`               VARCHAR(220) NOT NULL,
  `description`        TEXT         DEFAULT NULL,
  `short_description`  VARCHAR(500) DEFAULT NULL,
  `sku`                VARCHAR(80)  NOT NULL,
  `brand`              VARCHAR(120) DEFAULT NULL,
  `tags`               VARCHAR(500) DEFAULT NULL,
  `seo_title`          VARCHAR(200) DEFAULT NULL,
  `seo_description`    VARCHAR(500) DEFAULT NULL,
  `seo_keywords`       VARCHAR(500) DEFAULT NULL,
  `original_price`     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount`           DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  `sale_price`         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `price_override`     TINYINT(1)   NOT NULL DEFAULT 0,
  `stock`              INT NOT NULL DEFAULT 0,
  `sold_count`         INT NOT NULL DEFAULT 0,
  `rating_avg`         DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  `rating_count`       INT NOT NULL DEFAULT 0,
  `featured`           TINYINT(1) NOT NULL DEFAULT 0,
  `best_seller`        TINYINT(1) NOT NULL DEFAULT 0,
  `new_arrival`        TINYINT(1) NOT NULL DEFAULT 0,
  `status`             ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_slug` (`slug`),
  UNIQUE KEY `uq_products_sku`  (`sku`),
  KEY `idx_products_category` (`category_id`),
  KEY `idx_products_subcat`   (`subcategory_id`),
  KEY `idx_products_brand`    (`brand`),
  KEY `idx_products_status`   (`status`),
  KEY `idx_products_featured` (`featured`, `status`),
  KEY `idx_products_best`     (`best_seller`, `status`),
  KEY `idx_products_new`      (`new_arrival`, `status`),
  KEY `idx_products_price`    (`sale_price`),
  KEY `idx_products_stock`    (`stock`),
  KEY `idx_products_created`  (`created_at`),
  KEY `idx_products_rating`   (`rating_avg`),
  FULLTEXT KEY `ft_products_search` (`name`, `brand`, `sku`, `tags`, `seo_keywords`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`)
    REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_products_subcat` FOREIGN KEY (`subcategory_id`)
    REFERENCES `subcategories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- product_images
-- ----------------------------------------------------------------------------
CREATE TABLE `product_images` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` INT UNSIGNED NOT NULL,
  `image_url`  VARCHAR(255) NOT NULL,
  `alt_text`   VARCHAR(160) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_images_product` (`product_id`, `sort_order`),
  CONSTRAINT `fk_images_product` FOREIGN KEY (`product_id`)
    REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- product_specs  (key/value specification table shown on the product page)
-- ----------------------------------------------------------------------------
CREATE TABLE `product_specs` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` INT UNSIGNED NOT NULL,
  `spec_key`   VARCHAR(80)  NOT NULL,
  `spec_value` VARCHAR(255) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_specs_product` (`product_id`, `sort_order`),
  CONSTRAINT `fk_specs_product` FOREIGN KEY (`product_id`)
    REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- carts  (one open cart per user)
-- ----------------------------------------------------------------------------
CREATE TABLE `carts` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_carts_user` (`user_id`),
  CONSTRAINT `fk_carts_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- cart_items
-- ----------------------------------------------------------------------------
CREATE TABLE `cart_items` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cart_id`    INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `quantity`   INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cart_product` (`cart_id`, `product_id`),
  KEY `idx_cartitems_product` (`product_id`),
  CONSTRAINT `fk_cartitems_cart` FOREIGN KEY (`cart_id`)
    REFERENCES `carts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cartitems_product` FOREIGN KEY (`product_id`)
    REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- wishlists
-- ----------------------------------------------------------------------------
CREATE TABLE `wishlists` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wishlist` (`user_id`, `product_id`),
  KEY `idx_wishlist_product` (`product_id`),
  CONSTRAINT `fk_wishlist_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_wishlist_product` FOREIGN KEY (`product_id`)
    REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- orders
-- ----------------------------------------------------------------------------
CREATE TABLE `orders` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_number`    VARCHAR(24)  NOT NULL,
  `user_id`         INT UNSIGNED DEFAULT NULL,
  `customer_name`   VARCHAR(120) NOT NULL,
  `customer_phone`  VARCHAR(20)  NOT NULL,
  `customer_email`  VARCHAR(160) DEFAULT NULL,
  `customer_address`VARCHAR(500) NOT NULL,
  `city`            VARCHAR(80)  NOT NULL,
  `area`            VARCHAR(80)  NOT NULL,
  `delivery_zone`   ENUM('inside_dhaka','outside_dhaka') NOT NULL DEFAULT 'inside_dhaka',
  `notes`           TEXT         DEFAULT NULL,
  `subtotal`        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount`        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `coupon_id`       INT UNSIGNED DEFAULT NULL,
  `coupon_code`     VARCHAR(40)  DEFAULT NULL,
  `delivery_fee`    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total`           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_method`  VARCHAR(30)  NOT NULL DEFAULT 'cod',
  `payment_status`  ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `order_status`    ENUM('pending','confirmed','processing','shipped','delivered','cancelled')
                    NOT NULL DEFAULT 'pending',
  `cancel_requested`TINYINT(1)   NOT NULL DEFAULT 0,
  `status_note`     VARCHAR(255) DEFAULT NULL,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_orders_number` (`order_number`),
  KEY `idx_orders_user`    (`user_id`),
  KEY `idx_orders_status`  (`order_status`),
  KEY `idx_orders_created` (`created_at`),
  KEY `idx_orders_phone`   (`customer_phone`),
  KEY `idx_orders_coupon`  (`coupon_id`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_coupon` FOREIGN KEY (`coupon_id`)
    REFERENCES `coupons` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- order_items  (product snapshot so history stays correct after edits)
-- ----------------------------------------------------------------------------
CREATE TABLE `order_items` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`        INT UNSIGNED NOT NULL,
  `product_id`      INT UNSIGNED DEFAULT NULL,
  `category_id`     INT UNSIGNED DEFAULT NULL,
  `product_name`    VARCHAR(200) NOT NULL,
  `product_sku`     VARCHAR(80)  DEFAULT NULL,
  `product_image`   VARCHAR(255) DEFAULT NULL,
  `quantity`        INT NOT NULL DEFAULT 1,
  `original_price`  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount`        DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  `unit_price`      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total`           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `idx_orderitems_order`   (`order_id`),
  KEY `idx_orderitems_product` (`product_id`),
  CONSTRAINT `fk_orderitems_order` FOREIGN KEY (`order_id`)
    REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_orderitems_product` FOREIGN KEY (`product_id`)
    REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- reviews
-- ----------------------------------------------------------------------------
CREATE TABLE `reviews` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` INT UNSIGNED NOT NULL,
  `user_id`    INT UNSIGNED NOT NULL,
  `order_id`   INT UNSIGNED DEFAULT NULL,
  `rating`     TINYINT UNSIGNED NOT NULL,
  `review`     TEXT         DEFAULT NULL,
  `status`     ENUM('visible','hidden') NOT NULL DEFAULT 'visible',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_review_user_product` (`user_id`, `product_id`),
  KEY `idx_reviews_product` (`product_id`, `status`),
  KEY `idx_reviews_user`    (`user_id`),
  CONSTRAINT `fk_reviews_product` FOREIGN KEY (`product_id`)
    REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reviews_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reviews_order` FOREIGN KEY (`order_id`)
    REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- banners
-- ----------------------------------------------------------------------------
CREATE TABLE `banners` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`       VARCHAR(200) NOT NULL,
  `subtitle`    VARCHAR(300) DEFAULT NULL,
  `image_url`   VARCHAR(255) DEFAULT NULL,
  `mobile_image_url` VARCHAR(255) DEFAULT NULL,
  `button_text` VARCHAR(60)  DEFAULT NULL,
  `button_link` VARCHAR(255) DEFAULT NULL,
  `theme`       VARCHAR(20) NOT NULL DEFAULT 'default',
  `status`      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `sort_order`  INT NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_banners_status` (`status`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- coupons
-- ----------------------------------------------------------------------------
CREATE TABLE `coupons` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`            VARCHAR(40)  NOT NULL,
  `description`     VARCHAR(200) DEFAULT NULL,
  `discount_type`   ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
  `discount_value`  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `minimum_order`   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `maximum_discount`DECIMAL(10,2) DEFAULT NULL,
  `start_date`      DATETIME DEFAULT NULL,
  `expiry_date`     DATETIME DEFAULT NULL,
  `usage_limit`     INT DEFAULT NULL,
  `per_user_limit`  INT NOT NULL DEFAULT 1,
  `used_count`      INT NOT NULL DEFAULT 0,
  `status`          ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_coupons_code` (`code`),
  KEY `idx_coupons_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- coupon_usage
-- ----------------------------------------------------------------------------
CREATE TABLE `coupon_usage` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `coupon_id`  INT UNSIGNED NOT NULL,
  `user_id`    INT UNSIGNED DEFAULT NULL,
  `order_id`   INT UNSIGNED DEFAULT NULL,
  `amount`     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_coupon_usage_coupon` (`coupon_id`),
  KEY `idx_coupon_usage_user`   (`user_id`),
  KEY `idx_coupon_usage_order`  (`order_id`),
  CONSTRAINT `fk_cu_coupon` FOREIGN KEY (`coupon_id`)
    REFERENCES `coupons` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cu_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_cu_order` FOREIGN KEY (`order_id`)
    REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- conversations + messages  (customer <-> store chat)
-- ----------------------------------------------------------------------------
CREATE TABLE `conversations` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       INT UNSIGNED NOT NULL,
  `status`        ENUM('open','closed') NOT NULL DEFAULT 'open',
  `last_message`  VARCHAR(300) DEFAULT NULL,
  `last_message_at` DATETIME   DEFAULT NULL,
  `unread_admin`  INT NOT NULL DEFAULT 0,
  `unread_user`   INT NOT NULL DEFAULT 0,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_conversation_user` (`user_id`),
  KEY `idx_conv_status` (`status`, `last_message_at`),
  CONSTRAINT `fk_conv_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `messages` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `conversation_id` INT UNSIGNED NOT NULL,
  `sender_id`       INT UNSIGNED DEFAULT NULL,
  `sender_role`     ENUM('customer','admin','system') NOT NULL DEFAULT 'customer',
  `message`         TEXT NOT NULL,
  `is_read`         TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_messages_conversation` (`conversation_id`, `created_at`),
  KEY `idx_messages_unread` (`is_read`),
  CONSTRAINT `fk_messages_conversation` FOREIGN KEY (`conversation_id`)
    REFERENCES `conversations` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
CREATE TABLE `notifications` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `title`      VARCHAR(160) NOT NULL,
  `message`    VARCHAR(500) DEFAULT NULL,
  `type`       VARCHAR(40) NOT NULL DEFAULT 'general',
  `link`       VARCHAR(255) DEFAULT NULL,
  `is_read`    TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user` (`user_id`, `is_read`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- admin_activity_logs
-- ----------------------------------------------------------------------------
CREATE TABLE `admin_activity_logs` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id`    INT UNSIGNED DEFAULT NULL,
  `admin_name`  VARCHAR(120) DEFAULT NULL,
  `action`      VARCHAR(60) NOT NULL,
  `description` VARCHAR(500) DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_logs_created` (`created_at`),
  KEY `idx_logs_admin`   (`admin_id`),
  CONSTRAINT `fk_logs_admin` FOREIGN KEY (`admin_id`)
    REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- store_settings  (key/value configuration)
-- ----------------------------------------------------------------------------
CREATE TABLE `store_settings` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key`   VARCHAR(80)  NOT NULL,
  `setting_value` TEXT         DEFAULT NULL,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Default store settings
-- ----------------------------------------------------------------------------
INSERT INTO `store_settings` (`setting_key`, `setting_value`) VALUES
  ('store_name',         'EShopping'),
  ('store_tagline',      'Everything you love, delivered'),
  ('store_logo',         ''),
  ('store_phone',        '+8801724612320'),
  ('store_email',        'ihsafy2k21@gmail.com'),
  ('store_address',      'Dhaka, Bangladesh'),
  ('inside_dhaka_fee',   '60'),
  ('outside_dhaka_fee',  '120'),
  ('free_delivery_over', '5000'),
  ('low_stock_threshold','5'),
  ('allow_cancel',       '1'),
  ('default_order_status','pending'),
  ('featured_limit',     '8'),
  ('best_seller_limit',  '8'),
  ('new_arrival_limit',  '8'),
  ('per_page',           '12');

SET FOREIGN_KEY_CHECKS = 1;
