import React from 'react';
import {useLocation} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';
import ViewModeToggle from '../ViewModeToggle';

// The List/Grouped/Grid toggle only means something on the homepage (the
// post list) — render nothing on post pages, tag pages, About, etc.
export default function NavbarViewModeToggle(): React.JSX.Element | null {
  const {pathname} = useLocation();
  const homePath = useBaseUrl('/');

  if (pathname !== homePath) {
    return null;
  }

  return <ViewModeToggle />;
}
