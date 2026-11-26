-- E-24b: messages the owner wrote in the WhatsApp Business app are labelled "Você (celular)".

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "sent_from_phone" BOOLEAN NOT NULL DEFAULT false;
