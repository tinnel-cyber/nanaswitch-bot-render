// Script pour insérer immédiatement 'pous' dans Firestore via l'API REST Firestore
const projectId = 'nanasore';
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

async function seedDocument(collection, docId, fields) {
  const url = `${baseUrl}/${collection}/${docId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });

  const text = await response.text();
  console.log(`[SEED] ${collection}/${docId} status: ${response.status}`);
  if (!response.ok) {
    console.error(`[SEED ERROR] ${collection}/${docId}:`, text);
  } else {
    console.log(`[SEED SUCCESS] ${collection}/${docId} créé/mis à jour !`);
  }
}

async function main() {
  const timestamp = Date.now().toString();

  // Document Tenant pour pous
  const tenantFields = {
    storeId: { stringValue: 'pous' },
    storeName: { stringValue: 'Pousbila Telecom - Tunnel de Vente' },
    customDomain: { stringValue: 'pous.nanasore.com' },
    subdomain: { stringValue: 'pous' },
    type: { stringValue: 'funnel' },
    vendorType: { stringValue: 'funnel' },
    funnelId: { stringValue: 'pous' },
    funnelSlug: { stringValue: 'pous' },
    dealSlug: { stringValue: 'pous' },
    primaryColor: { stringValue: '#10b981' },
    theme: { stringValue: 'dark' },
    updatedAt: { integerValue: timestamp }
  };

  // Document Funnel pour pous
  const funnelFields = {
    id: { stringValue: 'pous' },
    slug: { stringValue: 'pous' },
    subdomain: { stringValue: 'pous' },
    customDomain: { stringValue: 'pous.nanasore.com' },
    title: { stringValue: 'Pousbila Telecom - Offre Exclusive' },
    funnelTitle: { stringValue: 'Pousbila Telecom - Offre Exclusive' },
    brandColor: { stringValue: '#10b981' },
    isPublished: { booleanValue: true },
    currency: { stringValue: 'FCFA' },
    salePrice: { integerValue: '25000' },
    originalPrice: { integerValue: '45000' },
    updatedAt: { integerValue: timestamp }
  };

  console.log('--- ENREGISTREMENT POUS DANS FIRESTORE ---');
  await seedDocument('tenants', 'pous', tenantFields);
  await seedDocument('tenants', 'pous.nanasore.com', tenantFields);
  await seedDocument('funnels', 'pous', funnelFields);
  await seedDocument('funnels', 'pous.nanasore.com', funnelFields);
  await seedDocument('deals', 'pous', funnelFields);
  await seedDocument('deals', 'pous.nanasore.com', funnelFields);
  console.log('--- ENREGISTREMENT TERMINÉ ---');
}

main().catch(console.error);
