# DAO Service Documentation

The DAO Service provides a comprehensive TypeScript interface for interacting with Decentralized Autonomous Organizations (DAOs) from the frontend. It includes proper error handling, validation, caching, and React hooks for easy integration.

## Architecture

```
src/
├── services/
│   └── DAOService.ts          # Core DAO service with API calls
├── hooks/
│   └── useDAO.ts              # React hooks for DAO operations
└── components/
    ├── DAOSection.tsx         # Updated component using new service
    └── DAOManagementExample.tsx # Complete example implementation
```

## Core Service (`DAOService.ts`)

### Features

- **Type Safety**: Full TypeScript interfaces for all DAO operations
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Request Throttling**: Built-in API throttling to prevent rate limiting
- **Validation**: Client-side validation of DAO parameters
- **Caching**: Request deduplication and caching mechanisms
- **Singleton Pattern**: Single service instance across the application

### Main Classes and Interfaces

#### `ClientDAOService`
The main service class that handles all DAO operations:

```typescript
const daoService = await getDAOService();

// Create a new DAO
const result = await daoService.createDAO({
  name: "TechCorp DAO",
  symbol: "TECH",
  jurisdiction: "Delaware, USA",
  mission: "Decentralized governance for tech innovation",
  roles: ["Founder", "Member"],
  roleHolders: ["0x123...", "0x456..."]
});

// Get all DAOs
const daos = await daoService.getAllDAOs();

// Get specific DAO by ID
const dao = await daoService.getDAO(1);

// Check deployment status
const deployment = await daoService.checkDeployment();
```

#### Key Types

```typescript
interface DAOData {
  id?: number;
  name: string;
  symbol: string;
  jurisdiction: string;
  mission: string;
  constitution?: string;
  roles: string[] | DAORole[];
  members?: string[];
  creator?: string;
  // ... additional fields
}

interface CreateDAORequest {
  name: string;
  symbol: string;
  jurisdiction: string;
  mission: string;
  constitution?: string;
  roles: string[];
  roleHolders: string[];
  createCompany?: boolean;
  companyData?: CompanyData;
}
```

## React Hooks (`useDAO.ts`)

### `useDAO()` Hook

The main hook for DAO operations in React components:

```typescript
function MyComponent() {
  const {
    // State
    daos,
    currentDAO,
    deploymentInfo,
    isLoading,
    error,
    isDeployed,

    // Actions
    createDAO,
    loadAllDAOs,
    loadDAO,
    checkDeployment,
    clearError,
    refreshDAOs,
    validateDAOParams
  } = useDAO();

  // Auto-load DAOs when component mounts
  useEffect(() => {
    if (isDeployed) {
      loadAllDAOs();
    }
  }, [isDeployed, loadAllDAOs]);

  // Create new DAO
  const handleCreate = async () => {
    const result = await createDAO({
      name: "My DAO",
      symbol: "MY",
      jurisdiction: "Delaware, USA",
      mission: "Decentralized governance",
      roles: ["Founder"],
      roleHolders: ["0x123..."]
    });
    
    if (result.success) {
      console.log('DAO created with ID:', result.daoId);
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {isLoading && <div>Loading...</div>}
      {daos.map(dao => (
        <div key={dao.id}>{dao.name}</div>
      ))}
      <button onClick={handleCreate}>Create DAO</button>
    </div>
  );
}
```

### `useDAOById(daoId)` Hook

For loading a specific DAO:

```typescript
function DAODetails({ daoId }: { daoId: number }) {
  const { dao, isLoading, error, reload } = useDAOById(daoId);

  if (isLoading) return <div>Loading DAO...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!dao) return <div>DAO not found</div>;

  return (
    <div>
      <h1>{dao.name}</h1>
      <p>{dao.mission}</p>
      <button onClick={reload}>Refresh</button>
    </div>
  );
}
```

### `useDAODeployment()` Hook

For monitoring deployment status:

```typescript
function DeploymentStatus() {
  const { deploymentInfo, isDeployed, isLoading, error } = useDAODeployment();

  return (
    <div>
      {isDeployed ? (
        <div className="success">
          ✅ Connected to {deploymentInfo?.networkName}
          <br />
          Contract: {deploymentInfo?.daoFactoryAddress}
        </div>
      ) : (
        <div className="warning">
          ⚠️ DAO Factory not deployed
          {error && <div>Error: {error}</div>}
        </div>
      )}
    </div>
  );
}
```

## Updated Components

### `DAOSection.tsx`

The existing DAO section component has been updated to use the new service:

```typescript
// Usage in company dashboard
<DAOSection
  companyId={companyId}
  daoContractAddress={company.daoContractAddress}
  companyName={company.name}
  onDAOCreated={(daoId) => {
    console.log('DAO created:', daoId);
    // Handle DAO creation
  }}
/>
```

### `DAOManagementExample.tsx`

A comprehensive example component demonstrating all features:

- DAO listing and creation
- Form validation
- Error handling
- Loading states
- Deployment status checking

## API Integration

The service integrates with existing API endpoints:

### POST `/api/dao`

```typescript
// Create DAO
{
  action: 'create',
  name: 'My DAO',
  symbol: 'MY',
  jurisdiction: 'Delaware, USA',
  mission: 'Decentralized governance',
  roles: ['Founder', 'Member'],
  roleHolders: ['0x123...', '0x456...'],
  createCompany: true,
  companyData: { /* company details */ }
}

// List all DAOs
{
  action: 'list'
}

// Get specific DAO
{
  action: 'get',
  daoId: 1
}
```

### GET `/api/dao?daoId=1`

Fetch specific DAO by ID.

### GET `/api/contracts?name=DAOFactory`

Get contract deployment information.

## Error Handling

The service provides comprehensive error handling:

```typescript
// Service-level errors
const result = await daoService.createDAO(params);
if (!result.success) {
  console.error('DAO creation failed:', result.error);
}

// Hook-level errors
const { error, clearError } = useDAO();
if (error) {
  // Display error to user
  console.error('DAO error:', error);
  // Clear error when handled
  clearError();
}
```

## Validation

Built-in parameter validation:

```typescript
const validation = daoService.validateDAOParams({
  name: 'My DAO',
  symbol: 'TOOLONG', // Will fail - max 10 chars
  roles: ['Founder'],
  roleHolders: ['invalid-address'] // Will fail - invalid format
});

if (!validation.isValid) {
  console.log('Validation errors:', validation.errors);
  // ['DAO symbol must be 10 characters or less', 'Invalid Ethereum address...']
}
```

## Usage Examples

### Basic DAO Creation

```typescript
import { useDAO } from '../hooks/useDAO';

function CreateDAOForm() {
  const { createDAO, isLoading, error } = useDAO();
  
  const handleSubmit = async (formData) => {
    const result = await createDAO({
      name: formData.name,
      symbol: formData.symbol,
      jurisdiction: formData.jurisdiction,
      mission: formData.mission,
      roles: formData.roles,
      roleHolders: formData.roleHolders,
      createCompany: true
    });
    
    if (result.success) {
      // Redirect to DAO dashboard
      router.push(`/dao/${result.daoId}`);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create DAO'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

### DAO List with Actions

```typescript
function DAOList() {
  const { daos, loadAllDAOs, isLoading } = useDAO();
  
  useEffect(() => {
    loadAllDAOs();
  }, [loadAllDAOs]);
  
  return (
    <div>
      {isLoading && <div>Loading DAOs...</div>}
      {daos.map(dao => (
        <div key={dao.id} className="dao-card">
          <h3>{dao.name} ({dao.symbol})</h3>
          <p>{dao.mission}</p>
          <div className="actions">
            <Link href={`/dao/${dao.id}`}>View</Link>
            <Link href={`/dao/${dao.id}/manage`}>Manage</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Integration with Existing Systems

The DAO service integrates seamlessly with:

- **Company Management**: Link DAOs to companies
- **Vector Memory**: Store DAO-related company data
- **Wallet Authentication**: Use WebAuthn for transactions
- **Smart Contracts**: Direct blockchain interaction via ethers.js

## Best Practices

1. **Always check deployment status** before DAO operations
2. **Use validation** before submitting forms
3. **Handle errors gracefully** with user feedback
4. **Cache requests** using the built-in throttling
5. **Reset cache** when needed with `refreshDAOs()`
6. **Use TypeScript** for full type safety

## Troubleshooting

### Common Issues

1. **"DAO Factory not deployed"**
   - Run `cd ethereum && npm run deploy` to deploy contracts
   - Check that the Ethereum node is running

2. **"Invalid Ethereum address"**
   - Ensure addresses start with "0x" and are 42 characters long
   - Use proper checksummed addresses

3. **"Failed to create DAO"**
   - Check that all required fields are provided
   - Verify the wallet has sufficient funds for gas
   - Ensure the signer account is available

### Debug Mode

Enable detailed logging:

```typescript
// In your component
const daoService = await getDAOService();
console.log('DAO Service initialized:', daoService);

// Check deployment
const deployment = await daoService.checkDeployment();
console.log('Deployment status:', deployment);
```

This comprehensive DAO service provides everything needed for frontend DAO interactions with proper TypeScript types, error handling, and React integration.