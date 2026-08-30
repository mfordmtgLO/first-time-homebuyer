ALTER TABLE `mortgage_payment_quote` ADD `firstName` varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `mortgage_payment_quote` ADD `lastName` varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `mortgage_payment_quote` ADD `program` enum('conventional','fha','usda','va','nonqm') DEFAULT 'conventional' NOT NULL;--> statement-breakpoint
ALTER TABLE `mortgage_payment_quote` ADD `monthlyFloodInsuranceCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `mortgage_payment_quote` ADD `creditScore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `mortgage_payment_quote` ADD `grossMonthlyIncomeCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `mortgage_payment_quote` ADD `monthlyConsumerDebtCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `mortgage_payment_quote` ADD `maxHousingPaymentCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `mortgage_payment_quote` ADD `availablePrincipalAndInterestCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `mortgage_payment_quote` ADD `maxPurchasePriceResultCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `mortgage_payment_quote` ADD `dtiBasisPoints` int DEFAULT 5000 NOT NULL;--> statement-breakpoint
ALTER TABLE `mortgage_payment_quote` ADD `minimumCreditScore` int DEFAULT 680 NOT NULL;--> statement-breakpoint
CREATE INDEX `mortgage_payment_quote_owner_max_price_idx` ON `mortgage_payment_quote` (`ownerUserId`,`maxPurchasePriceResultCents`);