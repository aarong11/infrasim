'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CompanyDetails } from '@/components/CompanyDetails';

export default function CompanyDetailsPage() {
  const params = useParams();
  const companyId = params.id as string;

  return <CompanyDetails companyId={companyId} />;
}