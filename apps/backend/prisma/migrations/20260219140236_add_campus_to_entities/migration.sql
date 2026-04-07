-- AlterTable
ALTER TABLE "books" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "calendar_events" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "transport_routes" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "campusId" TEXT;

-- CreateIndex
CREATE INDEX "books_campusId_idx" ON "books"("campusId");

-- CreateIndex
CREATE INDEX "calendar_events_campusId_idx" ON "calendar_events"("campusId");

-- CreateIndex
CREATE INDEX "expenses_campusId_idx" ON "expenses"("campusId");

-- CreateIndex
CREATE INDEX "resources_campusId_idx" ON "resources"("campusId");

-- CreateIndex
CREATE INDEX "transport_routes_campusId_idx" ON "transport_routes"("campusId");

-- CreateIndex
CREATE INDEX "vehicles_campusId_idx" ON "vehicles"("campusId");

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_routes" ADD CONSTRAINT "transport_routes_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
