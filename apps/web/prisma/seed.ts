import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create admin user
  const adminPassword = await hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@votehub.com" },
    update: {},
    create: {
      email: "admin@votehub.com",
      username: "admin",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user created:", admin.email);

  // Create default tags
  const defaultTags = [
    { name: "Politics", slug: "politics" },
    { name: "Technology", slug: "technology" },
    { name: "Science", slug: "science" },
    { name: "Entertainment", slug: "entertainment" },
    { name: "Sports", slug: "sports" },
    { name: "World News", slug: "world-news" },
    { name: "Opinion", slug: "opinion" },
  ];

  for (const tagData of defaultTags) {
    await prisma.tag.upsert({
      where: { slug: tagData.slug },
      update: {},
      create: {
        name: tagData.name,
        slug: tagData.slug,
        createdBy: admin.id,
      },
    });
  }

  console.log("✅ Created", defaultTags.length, "default tags");

  console.log("🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
