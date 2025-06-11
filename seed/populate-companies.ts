import { LangChainOrchestrator } from '../src/core/langchain-orchestrator';
import { CompanyMemoryRecord } from '../src/types/infrastructure';

const sampleCompanies = [
  // Banking & Financial Services
  {
    name: 'FinTech Bank',
    description: 'A leading digital bank specializing in mobile payments, cryptocurrency trading, and AI-powered financial advisory services for retail and business customers.',
    sectorTags: ['🏦 Banking', '💳 FinTech', '💰 Payments', '🤖 AI'],
    services: ['Digital Banking', 'Payment Processing', 'Crypto Trading', 'Financial Analytics', 'Customer Management', 'AI Advisory'],
    metadata: { 
      industry: 'banking', 
      complexity: 'complex', 
      compliance: ['GDPR', 'PCI-DSS', 'SOX', 'Basel III'],
      employees: 2500,
      founded: 2018,
      headquarters: 'London, UK'
    }
  },
  {
    name: 'NeoBank Solutions',
    description: 'A challenger bank offering seamless digital-first banking experiences with focus on SME lending and embedded finance solutions.',
    sectorTags: ['🏦 Banking', '💼 SME', '🔗 Embedded Finance'],
    services: ['SME Lending', 'Digital Onboarding', 'API Banking', 'Embedded Payments', 'Credit Scoring'],
    metadata: { 
      industry: 'banking', 
      complexity: 'moderate', 
      compliance: ['GDPR', 'PCI-DSS', 'Open Banking'],
      employees: 450,
      founded: 2020
    }
  },

  // Technology & AI
  {
    name: 'TechNova AI',
    description: 'A cutting-edge AI startup developing autonomous systems for healthcare, manufacturing, and smart city applications with advanced machine learning capabilities.',
    sectorTags: ['💻 Technology', '🤖 AI', '🚀 Startup', '🏥 Healthcare'],
    services: ['AI Solutions', 'Machine Learning', 'Computer Vision', 'Natural Language Processing', 'Autonomous Systems'],
    metadata: { 
      industry: 'tech', 
      complexity: 'simple', 
      compliance: ['ISO 27001', 'HIPAA'],
      employees: 85,
      founded: 2022
    }
  },
  {
    name: 'CloudScale Infrastructure',
    description: 'Enterprise cloud infrastructure provider offering multi-cloud management, containerization, and DevOps automation solutions for Fortune 500 companies.',
    sectorTags: ['☁️ Cloud', '💻 Technology', '🏢 Enterprise', '⚙️ DevOps'],
    services: ['Cloud Infrastructure', 'Container Orchestration', 'DevOps Automation', 'Multi-cloud Management', 'Security Monitoring'],
    metadata: { 
      industry: 'tech', 
      complexity: 'complex', 
      compliance: ['SOC 2', 'ISO 27001', 'FedRAMP'],
      employees: 1200,
      founded: 2016
    }
  },

  // Healthcare & Life Sciences
  {
    name: 'MedTech Innovations',
    description: 'A healthcare technology company developing IoT-enabled medical devices, telemedicine platforms, and AI-powered diagnostic tools for hospitals and clinics.',
    sectorTags: ['🏥 Healthcare', '💻 Technology', '🌐 IoT', '🔬 Medical Devices'],
    services: ['Medical Device Development', 'Telemedicine Platform', 'AI Diagnostics', 'IoT Health Monitoring', 'Clinical Data Analytics'],
    metadata: { 
      industry: 'healthcare', 
      complexity: 'complex', 
      compliance: ['HIPAA', 'FDA', 'ISO 13485', 'GDPR'],
      employees: 650,
      founded: 2019
    }
  },

  // Logistics & Supply Chain
  {
    name: 'LogiChain Global',
    description: 'An international logistics company leveraging AI and blockchain for supply chain optimization, last-mile delivery, and inventory management across 40 countries.',
    sectorTags: ['🚚 Logistics', '🤖 AI', '📦 Supply Chain', '🔗 Blockchain'],
    services: ['Supply Chain Management', 'AI Optimization', 'Last-mile Delivery', 'Warehouse Automation', 'Blockchain Tracking', 'Inventory Management'],
    metadata: { 
      industry: 'logistics', 
      complexity: 'complex', 
      compliance: ['ISO 27001', 'GDPR', 'C-TPAT'],
      employees: 15000,
      founded: 2010
    }
  },
  {
    name: 'DroneDeliver',
    description: 'Autonomous drone delivery service specializing in medical supplies, emergency response, and rural area logistics with advanced flight management systems.',
    sectorTags: ['🚁 Drones', '📦 Delivery', '🚑 Emergency', '🌾 Rural'],
    services: ['Drone Delivery', 'Flight Management', 'Emergency Response', 'Medical Supply Chain', 'Route Optimization'],
    metadata: { 
      industry: 'logistics', 
      complexity: 'moderate', 
      compliance: ['FAA', 'GDPR', 'ISO 27001'],
      employees: 180,
      founded: 2021
    }
  },

  // Defense & Security
  {
    name: 'DefenseNet Systems',
    description: 'A defense contractor specializing in cybersecurity solutions, secure communications, and threat intelligence for government and critical infrastructure protection.',
    sectorTags: ['🛡️ Defense', '🔒 Security', '📡 Communications', '🏛️ Government'],
    services: ['Cybersecurity Solutions', 'Secure Communications', 'Threat Intelligence', 'Network Security', 'Encryption Services', 'Risk Assessment'],
    metadata: { 
      industry: 'defense', 
      complexity: 'complex', 
      compliance: ['ITAR', 'FedRAMP', 'NIST', 'FISMA'],
      employees: 850,
      founded: 2015
    }
  },

  // E-commerce & Retail
  {
    name: 'RetailTech Solutions',
    description: 'Omnichannel retail technology platform providing inventory management, customer analytics, and personalized shopping experiences for major retail chains.',
    sectorTags: ['🛒 Retail', '💻 Technology', '📊 Analytics', '🛍️ E-commerce'],
    services: ['Inventory Management', 'Customer Analytics', 'Omnichannel Platform', 'Personalization Engine', 'Payment Processing'],
    metadata: { 
      industry: 'retail', 
      complexity: 'moderate', 
      compliance: ['PCI-DSS', 'GDPR', 'CCPA'],
      employees: 320,
      founded: 2018
    }
  },

  // Energy & Utilities
  {
    name: 'GreenGrid Energy',
    description: 'Smart grid technology company developing renewable energy management systems, IoT sensors, and AI-powered energy optimization for utilities and smart cities.',
    sectorTags: ['⚡ Energy', '🌱 Renewable', '🏙️ Smart Cities', '🌐 IoT'],
    services: ['Smart Grid Management', 'Renewable Energy Systems', 'IoT Monitoring', 'Energy Optimization', 'Grid Analytics'],
    metadata: { 
      industry: 'energy', 
      complexity: 'complex', 
      compliance: ['NERC CIP', 'ISO 27001', 'GDPR'],
      employees: 420,
      founded: 2017
    }
  },

  // Public Sector
  {
    name: 'PublicWorks Digital',
    description: 'Digital transformation consultancy for government agencies, providing citizen services platforms, data governance, and smart city infrastructure solutions.',
    sectorTags: ['🏛️ Government', '🏙️ Smart Cities', '👥 Citizen Services', '📊 Data Governance'],
    services: ['Digital Transformation', 'Citizen Services Platform', 'Data Governance', 'Smart City Solutions', 'Government Analytics'],
    metadata: { 
      industry: 'public', 
      complexity: 'complex', 
      compliance: ['GDPR', 'FISMA', 'FedRAMP', 'Section 508'],
      employees: 280,
      founded: 2014
    }
  },

  // Manufacturing & Industry 4.0
  {
    name: 'IndustrialAI Corp',
    description: 'Industry 4.0 solutions provider offering predictive maintenance, quality control automation, and digital twin technology for manufacturing companies.',
    sectorTags: ['🏭 Manufacturing', '🤖 AI', '⚙️ Industry 4.0', '🔧 Predictive Maintenance'],
    services: ['Predictive Maintenance', 'Quality Control Automation', 'Digital Twin Technology', 'IoT Integration', 'Manufacturing Analytics'],
    metadata: { 
      industry: 'manufacturing', 
      complexity: 'moderate', 
      compliance: ['ISO 27001', 'IEC 62443', 'GDPR'],
      employees: 195,
      founded: 2020
    }
  },

  // Telecommunications
  {
    name: 'NextGen Telecom',
    description: '5G network infrastructure provider delivering ultra-low latency communications, edge computing, and IoT connectivity solutions for enterprise customers.',
    sectorTags: ['📡 Telecom', '📶 5G', '⚡ Edge Computing', '🌐 IoT'],
    services: ['5G Infrastructure', 'Edge Computing', 'IoT Connectivity', 'Network Optimization', 'Telecommunications Security'],
    metadata: { 
      industry: 'telecom', 
      complexity: 'complex', 
      compliance: ['NIST', 'ISO 27001', 'GDPR', 'TCPA'],
      employees: 750,
      founded: 2019
    }
  }
];

async function populateVectorDatabase(): Promise<void> {
  console.log('🚀 Starting vector database population...\n');
  
  try {
    // Initialize the orchestrator (vector memory is automatically initialized)
    const orchestrator = new LangChainOrchestrator();
    
    console.log('✅ Vector memory initialized successfully\n');
    
    // Check if companies already exist
    const existingCompanies = await orchestrator.getAllCompaniesFromMemory();
    
    if (existingCompanies.length > 0) {
      console.log(`⚠️  Found ${existingCompanies.length} existing companies in database`);
      console.log('Companies will be added in addition to existing ones\n');
    }
    
    // Add all sample companies
    console.log(`📝 Adding ${sampleCompanies.length} sample companies to vector memory...\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let index = 0; index < sampleCompanies.length; index++) {
      const company = sampleCompanies[index];
      try {
        const id = await orchestrator.addCompanyToMemory(company);
        console.log(`✅ [${index + 1}/${sampleCompanies.length}] Added: ${company.name}`);
        console.log(`   ID: ${id}`);
        console.log(`   Tags: ${company.sectorTags.join(', ')}`);
        console.log(`   Services: ${company.services.length} services`);
        console.log(`   Industry: ${company.metadata.industry}\n`);
        successCount++;
      } catch (error) {
        console.error(`❌ [${index + 1}/${sampleCompanies.length}] Failed to add: ${company.name}`);
        console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        errorCount++;
      }
    }
    
    // Final summary
    console.log('📊 Population Summary:');
    console.log(`✅ Successfully added: ${successCount} companies`);
    if (errorCount > 0) {
      console.log(`❌ Failed to add: ${errorCount} companies`);
    }
    
    // Verify the final count
    const finalCompanies = await orchestrator.getAllCompaniesFromMemory();
    console.log(`🗄️  Total companies in database: ${finalCompanies.length}`);
    
    console.log('\n🎉 Vector database population completed!');
    
  } catch (error) {
    console.error('💥 Failed to populate vector database:', error);
    process.exit(1);
  }
}

// Allow running this script directly
if (require.main === module) {
  populateVectorDatabase()
    .then(() => {
      console.log('✨ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { populateVectorDatabase, sampleCompanies };