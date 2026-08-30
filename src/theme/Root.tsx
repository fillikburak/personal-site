import React from 'react';
import {ViewModeProvider} from '../contexts/ViewMode';

// Wraps the whole app so the List/Grouped/Grid preference (picked in the
// navbar) is available to the homepage content, even though they're
// siblings rather than parent/child.
export default function Root({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <ViewModeProvider>{children}</ViewModeProvider>;
}
