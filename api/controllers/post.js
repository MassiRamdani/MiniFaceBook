require('dotenv').config();
const Cookies = require('cookies');
const cryptojs = require('crypto-js');
const database = require('../utils/database');
const webpush = require("web-push");

/**
 * Ajout d'une nouvelle publication
 */
exports.newPost = (req, res, next) => {
  console.log("hello from new post backend");
  const connection = database.connect();

  const cryptedCookie = new Cookies(req, res).get('snToken');
  const userId = JSON.parse(cryptojs.AES.decrypt(cryptedCookie, process.env.COOKIE_KEY).toString(cryptojs.enc.Utf8)).userId;
  const picture = req.file ? `${req.protocol}://${req.get('host')}/images/${req.file.filename}` : null;
  const description = req.body.description ? req.body.description : null;
  const privacy = req.body.privacy ? req.body.privacy : "pb";

  console.log(picture,description,privacy);
  const sql = "INSERT INTO posts (user_id, picture, description, privacy)\
  VALUES (?, ?, ?, ?);";
  const sqlParams = [userId, picture, description, privacy];

  connection.execute(sql, sqlParams, (error, results, fields) => {
    if (error) {
      res.status(500).json({ "error": error.sqlMessage });
    } else {
      res.status(201).json({ message: 'Publication ajoutée' });
    }
  });

  /**
   * SEND PUSH NOTIF
   */

  const publicKey = 'BLBuFp4WTSzS9NDmgRoex_7GAwAI6_DdjNOcD8-0IG74iDIQk7wQvIZmqWE5t8W0PK29KdjB9lxOS9jDfLlqjAA';
  const privateKey = '_IQOuVkjwpzmJQPDf5YWbBx9-cH7zPtRzxacxvwi5Hg';

  const sub = {
    "endpoint":"https://wns2-par02p.notify.windows.com/w/?token=BQYAAABwwPCCCqL7AZ9UdvhxKAESCJa1Fb5kIj0QZIiFuacn5MK9RKCd6JR8yTANQZ1YVpzveInSDRQEmhJP%2faboLVWrYDJoNFQqd33cwVQksTHQS2EmPyvJiNT8ac26AhE8KITGDCmDfHapacgIybJJR%2ffetfQsw8pFZHtpVQGNvBJu07PgcgXgHNmAgB9aFj7s%2b7mEFbPeTR5stDmxhEKqrCuvCNn9l7xqTQemJatHghxG%2brMzt9hFXjjpO57DeQ5OH6Hjp%2fusT7dTJQa9%2fls%2fa7Wio9I4r9NJS8FcCqgAYq0dm5%2fBMz0mDOws%2feqWI8ToH50%3d",
    "expirationTime":null,
    "keys":{
      "p256dh":"BFDzeWBTaol4Vm-UvHlFo-sF4JLXU-1jwUv43bkfgHL9ivUb3rHa_dvZVqZgOK4yiGTGoDBVpBZ18Oo2ZtN3RBs",
      "auth":"Rg7xuHpbs_LgVNKDLnWt9A"}
  };

  webpush.setVapidDetails('mailto:example@yourdomain.org', publicKey, privateKey);

  const payLoad = {
    notification: {
      data: { userName : 'User 5' },
      title: 'User 5 added a new post !',
      vibrate: [100, 50, 100],
    },
  };


  webpush.sendNotification(sub, JSON.stringify(payLoad));
  connection.end();
}


/**
 * Récupération de tous les posts, avec commentaires et likes/dislikes
 */
// Fonction utilitaire : Récupérer les commentaires des posts
// posts est un ARRAY de posts (sans commentaires)
// connection : est la connection déjà ouverte précédemment
exports.getCommentsOfEachPosts = (posts, connection) => {
  return Promise.all(posts.map(post => {
    const sql = "SELECT comments.id AS commentId, comments.comment_date AS commentDate, comments.content As commentContent, users.id AS userId, users.name AS userName, users.picture AS userPicture\
                FROM comments\
                INNER JOIN users ON comments.user_id = users.id\
                WHERE comments.post_id = ?";
    const sqlParams = [post.postId];
    return new Promise((resolve, reject) => {
      connection.execute(sql, sqlParams, (error, comments, fields) => {
        if (error) {
          reject(error);
        } else {

          resolve({ ...post, comments });
        }
      });
    })
  }));
}

exports.setIsFriend = (post, connection,currentUserId) => {

    const sql= "SELECT COUNT(*) AS isFriend FROM `friends` WHERE (`id_user1` = ? AND id_user2 = ?) OR (`id_user2` =? AND id_user1 = ?)";
    const sqlParams = [currentUserId, post.userId, post.userId, currentUserId];
    console.log("Current user :",currentUserId);
    console.log("Post user :",post.userId);

    return new Promise((resolve, reject) => {
      connection.execute(sql, sqlParams, (error, results, fields) => {
        if (error) {
          reject(error);
        } else {
          //post.isFriend = results[0].isFriend
          console.log("Is friend :",results[0].isFriend);
          resolve({ ...post,isFriend : results[0].isFriend});
        }
      });
    });
}

// Fonction utilitaire : Récupérer les like/dislikes des posts
// posts est un ARRAY de posts (sans like/dislikes)
// connection : est la connection déjà ouverte précédemment
exports.getLikesOfEachPosts = (posts, userId, connection) => {
  return Promise.all(posts.map(post => {
    const postId = post.postId;
    const sql = "SELECT\
                (SELECT COUNT(*) FROM likes WHERE (post_id=? )) AS LikesNumber,\
                (SELECT COUNT(*) FROM likes WHERE (post_id=? )) AS DislikesNumber,\
                (SELECT COUNT(*) FROM likes WHERE (post_id=? AND user_id=?)) AS currentUserReaction";
    const sqlParams = [postId, postId, postId, userId];
    return new Promise((resolve, reject) => {
      connection.execute(sql, sqlParams, (error, result, fields) => {
        if (error) {
          reject(error);
        } else {
          /*const conn2 = database.connect();

          const sql2= "SELECT COUNT(*) AS isFriend FROM `friends` WHERE (`id_user1` = ? AND id_user2 = ?) OR (`id_user2` =? AND id_user1 = ?)";
          const sqlParams2 = [userId, post.userId, post.userId, userId];

          conn2.execute(sql2, sqlParams2, (error2, result2, fields2) => {
            if (error) {
              reject(error);
            } else {
              //post.isFriend = result2[0].isFriend;
              console.log(result2 )
              resolve({ ...post, likes: result[0] });
            }
          })*/
          resolve({ ...post, likes: result[0] });
        }
      });
    })
  }));
}

// Récupération de tous les posts, avec commentaires et likes/dislikes
exports.getAllPosts = (req, res, next) => {
  const connection = database.connect();
  // 1: récupération de tous les posts
  const sql = "SELECT posts.id AS postId, posts.post_date AS postDate, posts.picture AS postImage, posts.description as postContent, users.id AS userId, users.name AS userName, users.picture AS userPicture\
  FROM posts\
  INNER JOIN users ON posts.user_id = users.id\
  ORDER BY postDate DESC";
  connection.execute(sql, (error, rawPosts, fields) => {
    if (error) {
      connection.end();
      res.status(500).json({ "error": error.sqlMessage });
    } else {
      // 2: Pour chaque post, on va chercher tous les commentaires du post
      this.getCommentsOfEachPosts(rawPosts, connection)
        .then(postsWithoutLikes => {
          // 3: Pour chaque post, on rajoute les likes/dislikes
          const cryptedCookie = new Cookies(req, res).get('snToken');
          const userId = JSON.parse(cryptojs.AES.decrypt(cryptedCookie, process.env.COOKIE_KEY).toString(cryptojs.enc.Utf8)).userId;
          this.getLikesOfEachPosts(postsWithoutLikes, userId, connection)
            .then(posts => {
              res.status(200).json({ posts });
            })
            .catch(err => {
              res.status(500).json({ "error": "Un problème est survenu 1" });
            })
        })
        .catch(err => {
          res.status(500).json({ "error": "Un problème est survenu" });
        })
    }
  });
}

/**
 * Récupération de plusieurs posts (avec limit et offset)
 */
exports.getSomePosts = (req, res, next) => {
  const connection = database.connect();
  const connection2 = database.connect();
  // 1: récupération des posts recherchés
  const limit = parseInt(req.params.limit);
  const offset = parseInt(req.params.offset);
  const sql = "SELECT posts.id AS postId, posts.post_date AS postDate, posts.picture AS postImage, posts.description as postContent, posts.privacy AS postPrivacy, users.id AS userId, users.name AS userName, users.picture AS userPicture\
  FROM posts\
  INNER JOIN users ON posts.user_id = users.id\
  ORDER BY postDate DESC\
  LIMIT ? OFFSET ?;";
  const sqlParams = [limit, offset];


  connection.execute(sql, sqlParams, (error, rawPosts, fields) => {
    if (error) {
      connection.end();
      res.status(500).json({ "error": error.sqlMessage });
    } else {
        // 3: Pour chaque post, on rajoute les likes/dislikes
        // 2: Pour chaque post, on va chercher tous les commentaires du post
        this.getCommentsOfEachPosts(rawPosts, connection)
            .then(postsWithoutLikes => {
              // 3: Pour chaque post, on rajoute les likes/dislikes
              const cryptedCookie = new Cookies(req, res).get('snToken');
              const userId = JSON.parse(cryptojs.AES.decrypt(cryptedCookie, process.env.COOKIE_KEY).toString(cryptojs.enc.Utf8)).userId;
              this.getLikesOfEachPosts(postsWithoutLikes, userId, connection)
                  .then(posts => {
                    res.status(200).json({ posts });
                  })
            })

    }
  });
}

exports.getOnePost = (req, res, next) => {
  const connection = database.connect();
  // 1: récupération des posts recherchés
  const postId = parseInt(req.params.id);
  const sql = "SELECT posts.id AS postId, posts.post_date AS postDate, posts.picture AS postImage, posts.description as postContent, users.id AS userId, users.name AS userName, users.picture AS userPicture\
  FROM posts\
  INNER JOIN users ON posts.user_id = users.id\
  WHERE posts.id = ?\
  ORDER BY postDate DESC";
  const sqlParams = [postId];
  connection.execute(sql, sqlParams, (error, rawPosts, fields) => {
    if (error) {
      connection.end();
      res.status(500).json({ "error": error.sqlMessage });
    } else {
      // 2: on va chercher tous les commentaires du post
      this.getCommentsOfEachPosts(rawPosts, connection)
        .then(postsWithoutLikes => {
          // 3: Pour chaque post, on rajoute les likes/dislikes
          const cryptedCookie = new Cookies(req, res).get('snToken');
          const userId = JSON.parse(cryptojs.AES.decrypt(cryptedCookie, process.env.COOKIE_KEY).toString(cryptojs.enc.Utf8)).userId;
          this.getLikesOfEachPosts(postsWithoutLikes, userId, connection)
            .then(post => {
              res.status(200).json({ post });
            })
        })
    }
  });
}




/**
 * Suppression d'un post
 */
exports.deletePost = (req, res, next) => {
  const connection = database.connect();
  const postId = parseInt(req.params.id, 10);
  const sql = "DELETE FROM posts WHERE id=?;";
  const sqlParams = [postId];
  connection.execute(sql, sqlParams, (error, results, fields) => {
    if (error) {
      res.status(500).json({ "error": error.sqlMessage });
    } else {
      res.status(201).json({ message: 'Publication supprimée' });
    }
  });
  connection.end();
}
