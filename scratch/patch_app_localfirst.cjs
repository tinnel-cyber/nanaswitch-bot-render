const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add import
if (!content.includes('queuePosSaleBatch')) {
  content = content.replace(
    /updateSellerModeInFirestore,\s*\}\s*from '\.\/utils\/firestoreService';/,
    `updateSellerModeInFirestore,\n} from './utils/firestoreService';\nimport { queuePosSaleBatch } from './services/offlineSyncService';`
  );
}

// 2. Update deductCartFromInventory
const oldDeduct = `  // Deduct sold products from inventory and persist updated stock to Firestore
  const deductCartFromInventory = (itemsToDeduct: CartItem[]) => {
    const currentStoreId = getCurrentStoreId();
    setInventory((prev) =>
      prev.map((prod) => {
        const sold = itemsToDeduct.find((i) => i.id === prod.id);
        if (sold) {
          const updatedProd: InventoryProduct = {
            ...prod,
            stock: Math.max(0, (prod.stock || 0) - sold.quantity),
          };
          persistInventoryProduct(updatedProd, currentStoreId).catch((err) => {
            console.warn('[STOCK DEDUCTION] Erreur persistance stock produit vendu :', err);
          });
          return updatedProd;
        }
        return prod;
      })
    );
  };`;

const newDeduct = `  // Deduct sold products from inventory (Local-First : aucune écriture unitaire sur le réseau)
  const deductCartFromInventory = (itemsToDeduct: CartItem[]): InventoryProduct[] => {
    const updatedProducts: InventoryProduct[] = [];
    setInventory((prev) =>
      prev.map((prod) => {
        const sold = itemsToDeduct.find((i) => i.id === prod.id);
        if (sold) {
          const updatedProd: InventoryProduct = {
            ...prod,
            stock: Math.max(0, (prod.stock || 0) - sold.quantity),
          };
          updatedProducts.push(updatedProd);
          return updatedProd;
        }
        return prod;
      })
    );
    return updatedProducts;
  };`;

content = content.replace(oldDeduct.replace(/\r?\n/g, '\r\n'), newDeduct.replace(/\r?\n/g, '\r\n'));
if (!content.includes('Local-First : aucune écriture unitaire')) {
  content = content.replace(oldDeduct.replace(/\r?\n/g, '\n'), newDeduct.replace(/\r?\n/g, '\n'));
}

// 3. Update handleQuickCashCheckout
content = content.replace(
  `deductCartFromInventory(cart);\r\n    setSalesHistory((prev) => [sale, ...prev]);\r\n    persistCompletedSale(sale, currentStoreId);`,
  `const updatedStock = deductCartFromInventory(cart);\r\n    setSalesHistory((prev) => [sale, ...prev]);\r\n    queuePosSaleBatch(sale, updatedStock, currentStoreId).catch(() => {});`
);
content = content.replace(
  `deductCartFromInventory(cart);\n    setSalesHistory((prev) => [sale, ...prev]);\n    persistCompletedSale(sale, currentStoreId);`,
  `const updatedStock = deductCartFromInventory(cart);\n    setSalesHistory((prev) => [sale, ...prev]);\n    queuePosSaleBatch(sale, updatedStock, currentStoreId).catch(() => {});`
);

// 4. Update handleConfirmCashPayment
content = content.replace(
  `deductCartFromInventory(cart);\r\n    setSalesHistory((prev) => [sale, ...prev]);\r\n    persistCompletedSale(sale, currentStoreId);\r\n    setIsCashModalOpen(false);`,
  `const updatedStock = deductCartFromInventory(cart);\r\n    setSalesHistory((prev) => [sale, ...prev]);\r\n    queuePosSaleBatch(sale, updatedStock, currentStoreId).catch(() => {});\r\n    setIsCashModalOpen(false);`
);
content = content.replace(
  `deductCartFromInventory(cart);\n    setSalesHistory((prev) => [sale, ...prev]);\n    persistCompletedSale(sale, currentStoreId);\n    setIsCashModalOpen(false);`,
  `const updatedStock = deductCartFromInventory(cart);\n    setSalesHistory((prev) => [sale, ...prev]);\n    queuePosSaleBatch(sale, updatedStock, currentStoreId).catch(() => {});\n    setIsCashModalOpen(false);`
);

// 5. Update handleQuickAssignToCustomer
content = content.replace(
  `deductCartFromInventory(cart);\r\n    setSalesHistory((prev) => [sale, ...prev]);\r\n    persistCompletedSale(sale, currentStoreId);`,
  `const updatedStock = deductCartFromInventory(cart);\r\n    setSalesHistory((prev) => [sale, ...prev]);\r\n    queuePosSaleBatch(sale, updatedStock, currentStoreId).catch(() => {});`
);
content = content.replace(
  `deductCartFromInventory(cart);\n    setSalesHistory((prev) => [sale, ...prev]);\n    persistCompletedSale(sale, currentStoreId);`,
  `const updatedStock = deductCartFromInventory(cart);\n    setSalesHistory((prev) => [sale, ...prev]);\n    queuePosSaleBatch(sale, updatedStock, currentStoreId).catch(() => {});`
);

// 6. Update credit sale
content = content.replace(
  `setSalesHistory((prev) => [creditSale, ...prev]);\r\n    persistCompletedSale(creditSale, currentStoreId);\r\n\r\n    deductCartFromInventory(cart);\r\n    setIsCreditModalOpen(false);`,
  `const updatedStock = deductCartFromInventory(cart);\r\n    setSalesHistory((prev) => [creditSale, ...prev]);\r\n    queuePosSaleBatch(creditSale, updatedStock, currentStoreId).catch(() => {});\r\n    setIsCreditModalOpen(false);`
);
content = content.replace(
  `setSalesHistory((prev) => [creditSale, ...prev]);\n    persistCompletedSale(creditSale, currentStoreId);\n\n    deductCartFromInventory(cart);\n    setIsCreditModalOpen(false);`,
  `const updatedStock = deductCartFromInventory(cart);\n    setSalesHistory((prev) => [creditSale, ...prev]);\n    queuePosSaleBatch(creditSale, updatedStock, currentStoreId).catch(() => {});\n    setIsCreditModalOpen(false);`
);

fs.writeFileSync('src/App.tsx', content, 'utf8');
console.log('src/App.tsx updated successfully with Local-First POS!');
