'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CompanyDashboard } from '@/components/CompanyDashboard';

export default function CompanyDashboardPage() {
  const params = useParams();
  const companyId = params.id as string;

  return <CompanyDashboard companyId={companyId} />;
}