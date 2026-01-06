-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: DBtest
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `category`
--

DROP TABLE IF EXISTS `category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(20) NOT NULL,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category`
--

LOCK TABLES `category` WRITE;
/*!40000 ALTER TABLE `category` DISABLE KEYS */;
INSERT INTO `category` VALUES (1,'仿賽'),(2,'街跑'),(3,'街車'),(4,'速可達'),(5,'冒險');
/*!40000 ALTER TABLE `category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `licensetype`
--

DROP TABLE IF EXISTS `licensetype`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `licensetype` (
  `license_id` int NOT NULL AUTO_INCREMENT,
  `license_name` varchar(20) NOT NULL,
  `description` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`license_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `licensetype`
--

LOCK TABLES `licensetype` WRITE;
/*!40000 ALTER TABLE `licensetype` DISABLE KEYS */;
INSERT INTO `licensetype` VALUES (1,'紅牌','550cc以上'),(2,'黃牌','250~550cc'),(3,'白牌','250cc以下');
/*!40000 ALTER TABLE `licensetype` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `motorcycle`
--

DROP TABLE IF EXISTS `motorcycle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `motorcycle` (
  `moto_id` int NOT NULL AUTO_INCREMENT,
  `brand` varchar(50) DEFAULT NULL,
  `model` varchar(50) DEFAULT NULL,
  `year` smallint DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `mileage` int DEFAULT NULL,
  `description` text,
  `license_id` int DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `seller_id` int DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` enum('available','sold','removed') DEFAULT 'available',
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`moto_id`),
  KEY `license_id` (`license_id`),
  KEY `category_id` (`category_id`),
  KEY `seller_id` (`seller_id`),
  CONSTRAINT `motorcycle_ibfk_1` FOREIGN KEY (`license_id`) REFERENCES `licensetype` (`license_id`),
  CONSTRAINT `motorcycle_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`),
  CONSTRAINT `motorcycle_ibfk_3` FOREIGN KEY (`seller_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `motorcycle`
--

LOCK TABLES `motorcycle` WRITE;
/*!40000 ALTER TABLE `motorcycle` DISABLE KEYS */;
INSERT INTO `motorcycle` VALUES (8,'Yamaha','YZF-R15',2021,85000.00,12000,'正常代步使用，無事故無泡水，定期保養，外觀約8成新。',3,1,2,'/uploads/1767590650112.jpeg','2026-01-04 21:17:33','2026-01-05 13:24:10','available',NULL),(9,'Suzuki','GSX-R150',2020,78000.00,18000,'引擎狀況良好，僅有些微使用痕跡，適合新手入門仿賽。',3,1,2,'/uploads/1767590664576.jpg','2026-01-04 21:17:33','2026-01-05 13:24:24','available',NULL),(10,'Kawasaki','Ninja 250',2019,255000.00,23000,'黃牌仿賽，無改裝，原廠保養，動力正常，適合跑山與通勤。',2,1,2,'/uploads/1767590687924.jpg','2026-01-04 21:17:33','2026-01-05 13:24:47','available',NULL),(11,'Yamaha','MT-03',2022,158000.00,8000,'少騎，車況近新，原廠配置，適合日常通勤與假日騎乘。',2,2,2,'/uploads/1767590587060.jfif','2026-01-04 21:17:44','2026-01-05 13:23:07','available',NULL),(12,'Honda','CB300R',2021,165000.00,15000,'輕量街車，操控佳，僅正常使用痕跡，無事故紀錄。',2,3,2,'/uploads/1767590605900.jfif','2026-01-04 21:17:44','2026-01-05 20:01:32','available',NULL),(13,'Kawasaki','Z900',2018,328000.00,27000,'紅牌街車，定期保養，動力輸出正常，無重大事故。',1,3,2,'/uploads/1767590629229.jfif','2026-01-04 21:17:44','2026-01-05 13:23:49','available',NULL),(14,'Yamaha','NMAX 155',2022,72000.00,9000,'通勤使用，油耗佳，車況良好，無重大維修紀錄。',3,4,2,'/uploads/1767590517840.jfif','2026-01-04 21:17:49','2026-01-05 21:19:32','available',NULL),(15,'Honda','PCX 150',2020,88000.00,20000,'引擎穩定，適合長距離通勤，外觀有些微使用痕跡。',3,4,2,'/uploads/1767590539136.jfif','2026-01-04 21:17:49','2026-01-05 20:01:30','available',NULL),(16,'Honda','ADV 160',2023,158000.00,3000,'近新車，少騎，跨界速可達，避震與車身狀況良好。',3,4,2,'/uploads/1767590567910.jfif','2026-01-04 21:17:49','2026-01-05 13:36:46','available',NULL),(17,'Honda','CRF300L',2022,235000.00,11000,'輕度越野使用，車況正常，無重大損傷，適合露營與長途旅行。',2,5,2,'/uploads/1767590850740.png','2026-01-04 21:17:52','2026-01-05 22:09:25','available',NULL),(18,'Yamaha','Tenere 700',2021,298000.00,19000,'冒險車款，定期保養，無摔車紀錄，適合環島與長途。',1,5,2,'/uploads/1767590472895.jpg','2026-01-04 21:17:52','2026-01-05 22:09:24','sold',NULL);
/*!40000 ALTER TABLE `motorcycle` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `motorcycleimage`
--

DROP TABLE IF EXISTS `motorcycleimage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `motorcycleimage` (
  `image_id` int NOT NULL AUTO_INCREMENT,
  `moto_id` int NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`image_id`),
  KEY `moto_id` (`moto_id`),
  CONSTRAINT `motorcycleimage_ibfk_1` FOREIGN KEY (`moto_id`) REFERENCES `motorcycle` (`moto_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `motorcycleimage`
--

LOCK TABLES `motorcycleimage` WRITE;
/*!40000 ALTER TABLE `motorcycleimage` DISABLE KEYS */;
/*!40000 ALTER TABLE `motorcycleimage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservation`
--

DROP TABLE IF EXISTS `reservation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservation` (
  `reserve_id` int NOT NULL AUTO_INCREMENT,
  `moto_id` int NOT NULL,
  `buyer_id` int NOT NULL,
  `reserve_time` datetime NOT NULL,
  `status` enum('pending','confirmed','canceled') DEFAULT 'pending',
  `note` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reserve_id`),
  KEY `moto_id` (`moto_id`),
  KEY `buyer_id` (`buyer_id`),
  CONSTRAINT `reservation_ibfk_1` FOREIGN KEY (`moto_id`) REFERENCES `motorcycle` (`moto_id`) ON DELETE CASCADE,
  CONSTRAINT `reservation_ibfk_2` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservation`
--

LOCK TABLES `reservation` WRITE;
/*!40000 ALTER TABLE `reservation` DISABLE KEYS */;
INSERT INTO `reservation` VALUES (2,14,3,'2026-01-12 21:15:00','canceled','','2026-01-05 21:15:51'),(3,10,3,'2026-02-19 21:39:00','canceled','我想改看其他車','2026-01-05 21:39:45'),(4,17,5,'2026-01-06 08:20:00','confirmed','','2026-01-06 08:20:41');
/*!40000 ALTER TABLE `reservation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `role` enum('buyer','seller','admin') DEFAULT 'buyer',
  `password` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (2,'1號管理員','000-0000000','admin@gmail.com','admin','20040331'),(5,'qwe','21346578','qwer@gmail.com','buyer','qwer');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-06  8:29:35
