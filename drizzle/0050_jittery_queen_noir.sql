CREATE TABLE `mortgage_payment_quote` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`purchasePriceCents` int NOT NULL,
	`downPaymentPercentBasisPoints` int NOT NULL,
	`annualRateBasisPoints` int NOT NULL,
	`termYears` int NOT NULL,
	`annualPropertyTaxCents` int NOT NULL DEFAULT 0,
	`annualHomeInsuranceCents` int NOT NULL DEFAULT 0,
	`monthlyHoaDuesCents` int NOT NULL DEFAULT 0,
	`monthlyMortgageInsuranceCents` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mortgage_payment_quote_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `mortgage_payment_quote_owner_created_idx` ON `mortgage_payment_quote` (`ownerUserId`,`createdAt`);