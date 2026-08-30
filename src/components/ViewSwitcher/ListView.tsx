import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import type {PostMetadata} from './types';
import {formatDate} from './formatDate';
import styles from './listView.module.css';

export default function ListView({
  posts,
}: {
  posts: PostMetadata[];
}): React.JSX.Element {
  const {
    i18n: {currentLocale},
  } = useDocusaurusContext();

  return (
    <div className={styles.list}>
      {posts.map((post) => (
        <article key={post.permalink} className={styles.row}>
          <div className={styles.date}>
            {formatDate(post.date, currentLocale)}
          </div>
          <div>
            <h2 className={styles.title}>
              <Link to={post.permalink}>{post.title}</Link>
            </h2>
            <p className={styles.description}>{post.description}</p>
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
          </div>
        </article>
      ))}
    </div>
  );
}
