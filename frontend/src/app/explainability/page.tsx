import React from 'react';
import ExplainabilityClient from './ExplainabilityClient';

// Force dynamic rendering for this route so Next.js doesn't attempt to
// prerender or run client-only hooks during the build.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <ExplainabilityClient />;
}
