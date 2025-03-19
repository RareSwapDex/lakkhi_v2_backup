#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Fixing TypeScript dependency issues...');

// Path to the problematic file
const targetPath = path.join(
  process.cwd(),
  'node_modules/@solana/spl-token-metadata/node_modules/@solana/codecs-data-structures/dist/types/discriminated-union.d.ts'
);

// Check if the file exists
try {
  if (fs.existsSync(targetPath)) {
    console.log(`Found problematic file: ${targetPath}`);
    
    // Read the file content
    const content = fs.readFileSync(targetPath, 'utf8');
    
    // Replace the problematic 'const' type parameter declarations
    const fixedContent = content
      .replace(/<\s*const\s+TVariants/g, '<TVariants')
      .replace(/<\s*const\s+TDiscriminatorProperty/g, '<TDiscriminatorProperty')
      .replace(/extends\s+Variants<\s*Encoder<\s*any\s*>>/g, 'extends Variants<Encoder<any>>')
      .replace(/extends\s+string\s+=\s+\'__kind\'>/g, 'extends string>');
    
    // Write back the fixed content
    fs.writeFileSync(targetPath, fixedContent);
    console.log('Successfully patched the file.');
  } else {
    console.log('Problematic file not found, may have been renamed or moved. Checking directory structure...');
    
    // Check if the general directory exists
    const baseDir = path.join(
      process.cwd(),
      'node_modules/@solana/spl-token-metadata/node_modules/@solana/codecs-data-structures'
    );
    
    if (fs.existsSync(baseDir)) {
      console.log(`Found base directory: ${baseDir}`);
      // List files recursively to find .d.ts files
      const findTypesFiles = (dir) => {
        let results = [];
        const list = fs.readdirSync(dir);
        
        list.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat && stat.isDirectory()) {
            // Recursively search directories
            results = results.concat(findTypesFiles(filePath));
          } else if (file.endsWith('.d.ts')) {
            // Found a TypeScript declaration file
            results.push(filePath);
          }
        });
        
        return results;
      };
      
      const typeFiles = findTypesFiles(baseDir);
      console.log(`Found ${typeFiles.length} TypeScript declaration files.`);
      
      // Check and fix all .d.ts files
      let fixedCount = 0;
      typeFiles.forEach(filePath => {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Check if file contains the problematic 'const' keyword in type parameters
          if (content.includes('<const ')) {
            // Apply the fix
            const fixedContent = content
              .replace(/<\s*const\s+(\w+)/g, '<$1')
              .replace(/extends\s+([^>]+)>/g, 'extends $1>');
            
            // Write back the fixed content
            fs.writeFileSync(filePath, fixedContent);
            console.log(`Fixed file: ${filePath}`);
            fixedCount++;
          }
        } catch (err) {
          console.error(`Error processing file ${filePath}:`, err);
        }
      });
      
      if (fixedCount > 0) {
        console.log(`Successfully patched ${fixedCount} files.`);
      } else {
        console.log('No files needed patching.');
      }
    } else {
      console.log('Base directory for Solana codecs not found. The dependency structure may have changed.');
    }
  }
} catch (error) {
  console.error('Error fixing TypeScript dependency issues:', error);
}

console.log('TypeScript dependency fix completed.'); 