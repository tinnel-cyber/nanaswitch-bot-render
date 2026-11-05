const fs = require('fs');
let code = fs.readFileSync('src/data/comparisonMatrixData.ts', 'utf8').replace(/\r\n/g, '\n');

code = code.replace(
  /id: 'feat_cashiers_pin'[\s\S]*?elite: 'Illimité'/,
  "id: 'feat_cashiers_pin',\n    name: 'Multi-Vendeurs & Caissiers avec Code PIN',\n    category: 'ecommerce',\n    isVipCrown: true,\n    tooltip: 'Comptes d\\'accès dédiés avec verrouillage PIN individuel pour vos employés.',\n    free: '1 caissier',\n    starter: '5 caissiers',\n    pro: '5 caissiers',\n    elite: 'Illimité'"
);

fs.writeFileSync('src/data/comparisonMatrixData.ts', code, 'utf8');
console.log('Comparison matrix cashiers updated successfully');
