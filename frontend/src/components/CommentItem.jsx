import React from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import styles from './CommentItem.module.css';

export default function CommentItem({ comment }) {
  const avatarUrl = comment.author.avatar ||
    `https://ui-avatars.com/api/?name=${comment.author.username}&background=657786&color=fff&size=36`;

  return (
    <div className={styles.item}>
      <img src={avatarUrl} alt={comment.author.username} className={styles.avatar} />
      <div className={styles.body}>
        <div className={styles.header}>
          <Link to={`/profile/${comment.author.username}`} className={styles.name}>
            {comment.author.first_name || comment.author.username}
          </Link>
          <span className={styles.handle}>@{comment.author.username}</span>
          <span className={styles.time}>
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className={styles.content}>{comment.content}</p>
      </div>
    </div>
  );
}
