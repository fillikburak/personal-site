import React from 'react';
import Link from '@docusaurus/Link';
import Translate from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import type {PostMetadata} from './types';
import {formatDate} from './formatDate';
import styles from './gridView.module.css';

export default function GridView({
  posts,
}: {
  posts: PostMetadata[];
}): React.JSX.Element {
  const {
    i18n: {currentLocale},
  } = useDocusaurusContext();

  return (
    <div className={styles.grid}>
      {posts.map((post) => (
        <article key={post.permalink} className={styles.card}>
          {post.tags.length > 0 && (
            <div className={styles.tags}>
              {post.tags.map((tag) => (
                <Link
                  key={tag.permalink}
                  to={tag.permalink}
                  className={styles.tag}>
                  {tag.label}
                </Link>
              ))}
            </div>
          )}
          <h2 className={styles.title}>
            <Link to={post.permalink}>{post.title}</Link>
          </h2>
          <p className={styles.description}>{post.description}</p>
          <div className={styles.meta}>
            <span>{formatDate(post.date, currentLocale)}</span>
            {post.readingTime != null && (
              <span>
                <Translate
                  id="gridView.readingTime"
                  description="Grid card: reading time, e.g. '2 min'"
                  values={{count: Math.max(1, Math.round(post.readingTime))}}>
                  {'{count} min'}
                </Translate>
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
