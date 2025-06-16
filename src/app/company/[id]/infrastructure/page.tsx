'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CompanyInfrastructure } from '@/components/CompanyInfrastructure';

export default function CompanyInfrastructurePage() {
  const params = useParams();
  const companyId = params.id as string;

  return <CompanyInfrastructure companyId={companyId} />;
}