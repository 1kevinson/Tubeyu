-- CreateTable
CREATE TABLE "track_sources" (
    "id" UUID NOT NULL,
    "track_id" UUID NOT NULL,
    "source_url" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,

    CONSTRAINT "track_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "track_sources_track_id_idx" ON "track_sources"("track_id");

-- CreateIndex
CREATE UNIQUE INDEX "track_sources_provider_external_id_key" ON "track_sources"("provider", "external_id");

-- AddForeignKey
ALTER TABLE "track_sources" ADD CONSTRAINT "track_sources_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
