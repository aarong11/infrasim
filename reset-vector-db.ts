#!/usr/bin/env ts-node

import { existsSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';
import { LangChainOrchestrator } from './src/core/langchain-orchestrator';
import { populateVectorDatabase } from './seed/populate-companies';

const VECTOR_STORE_PATH = './data/vector-store';
const DOCSTORE_FILE = join(VECTOR_STORE_PATH, 'docstore.json');
const FAISS_INDEX_FILE = join(VECTOR_STORE_PATH, 'faiss.index');

/**
 * Delete vector database files from disk
 */
function clearVectorStoreFiles(): void {
  console.log('🗑️  Clearing vector database files...');
  
  let filesDeleted = 0;
  
  if (existsSync(DOCSTORE_FILE)) {
    unlinkSync(DOCSTORE_FILE);
    console.log('   ✅ Deleted docstore.json');
    filesDeleted++;
  }
  
  if (existsSync(FAISS_INDEX_FILE)) {
    unlinkSync(FAISS_INDEX_FILE);
    console.log('   ✅ Deleted faiss.index');
    filesDeleted++;
  }
  
  if (filesDeleted === 0) {
    console.log('   ℹ️  No vector store files found to delete');
  } else {
    console.log(`   📊 Total files deleted: ${filesDeleted}\n`);
  }
}

/**
 * Verify that the vector database is empty
 */
async function verifyDatabaseEmpty(): Promise<boolean> {
  console.log('🔍 Verifying database is empty...');
  
  try {
    const orchestrator = new LangChainOrchestrator();
    const companies = await orchestrator.getAllCompaniesFromMemory();
    
    if (companies.length === 0) {
      console.log('   ✅ Database is empty\n');
      return true;
    } else {
      console.log(`   ⚠️  Database still contains ${companies.length} companies\n`);
      return false;
    }
  } catch (error) {
    // If we get an error, it might mean the database doesn't exist yet, which is good
    console.log('   ✅ Database appears to be empty (no existing vector store)\n');
    return true;
  }
}

/**
 * Display final statistics
 */
async function displayFinalStats(): Promise<void> {
  console.log('📊 Final Database Statistics:');
  
  try {
    const orchestrator = new LangChainOrchestrator();
    const companies = await orchestrator.getAllCompaniesFromMemory();
    
    console.log(`   📝 Total companies: ${companies.length}`);
    
    // Group by industry
    const industries = companies.reduce((acc, company) => {
      const industry = company.metadata?.industry || 'unknown';
      acc[industry] = (acc[industry] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('   🏭 By Industry:');
    Object.entries(industries)
      .sort(([,a], [,b]) => b - a)
      .forEach(([industry, count]) => {
        console.log(`      ${industry}: ${count} companies`);
      });
    
    // Group by complexity
    const complexities = companies.reduce((acc, company) => {
      const complexity = company.metadata?.complexity || 'unknown';
      acc[complexity] = (acc[complexity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('   📈 By Complexity:');
    Object.entries(complexities)
      .sort(([,a], [,b]) => b - a)
      .forEach(([complexity, count]) => {
        console.log(`      ${complexity}: ${count} companies`);
      });
    
  } catch (error) {
    console.error('   ❌ Failed to retrieve statistics:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Main reset and reseed function
 */
async function resetAndReseedVectorDatabase(): Promise<void> {
  console.log('🚀 Vector Database Reset & Reseed Script');
  console.log('==========================================\n');
  
  const startTime = Date.now();
  
  try {
    // Step 1: Clear existing vector store files
    clearVectorStoreFiles();
    
    // Step 2: Verify database is empty
    const isEmpty = await verifyDatabaseEmpty();
    
    if (!isEmpty) {
      console.log('⚠️  Warning: Database may not be completely empty. Continuing anyway...\n');
    }
    
    // Step 3: Re-seed with fresh data
    console.log('🌱 Starting re-seeding process...\n');
    await populateVectorDatabase();
    
    // Step 4: Display final statistics
    console.log('\n📈 Database Reset Complete!');
    console.log('============================\n');
    await displayFinalStats();
    
    const duration = Date.now() - startTime;
    console.log(`\n⏱️  Total execution time: ${(duration / 1000).toFixed(2)} seconds`);
    console.log('✨ Vector database has been successfully reset and re-seeded!');
    
  } catch (error) {
    console.error('\n💥 Reset script failed:', error instanceof Error ? error.message : 'Unknown error');
    console.error('\nTroubleshooting tips:');
    console.error('1. Make sure Ollama is running (yarn ollama:start)');
    console.error('2. Check that the required models are available');
    console.error('3. Verify file permissions in the data/vector-store directory');
    throw error;
  }
}

/**
 * CLI options handling
 */
function parseCliArgs(): { force: boolean; quiet: boolean } {
  const args = process.argv.slice(2);
  return {
    force: args.includes('--force') || args.includes('-f'),
    quiet: args.includes('--quiet') || args.includes('-q')
  };
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const { force, quiet } = parseCliArgs();
  
  if (!quiet) {
    console.log('This script will:');
    console.log('1. 🗑️  Delete all existing vector database files');
    console.log('2. 🧹 Clear all company records from memory');
    console.log('3. 🌱 Re-seed the database with sample companies');
    console.log();
  }
  
  if (!force && !quiet) {
    // In a real CLI, you'd use a library like 'inquirer' for prompts
    // For now, we'll just proceed with a warning
    console.log('⚠️  This will permanently delete all existing data!');
    console.log('💡 Use --force to skip this warning, --quiet for minimal output');
    console.log('🚀 Proceeding in 3 seconds...\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  await resetAndReseedVectorDatabase();
}

// Allow running this script directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { resetAndReseedVectorDatabase, clearVectorStoreFiles };