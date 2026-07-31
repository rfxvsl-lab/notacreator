import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://quicknota.rfx.web.id',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // Jika ada rute statis lainnya di masa depan, tambahkan di sini
  ];
}
