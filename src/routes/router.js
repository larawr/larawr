//router.js
const { Router } = require('express');
const User = require('../models/user'); 
const Post = require('../models/post');

const crypto = require('crypto');

function hashPassword(password) {
  // Create a new SHA-256 hash object
  const hash = crypto.createHash('sha256');
  
  // Update the hash object with the password
  hash.update(password);
  
  // Get the hashed password in hexadecimal format
  const hashedPassword = hash.digest('hex');
  
  return hashedPassword;
}


// Define lookupUsername function
async function lookupUsername(accountID) {
    const user = await User.findOne({ accountID });
    return user ? user.username : 'Unknown User';
}

const router = Router();




// Render registration form
router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    let accountID;

    try {
        let existingUser; // Declare existingUser here

        // Keep generating a new accountID until a unique one is found
        do {
            accountID = generateRandomNumber(10000, 99999);
            existingUser = await User.findOne({ accountID });
        } while (existingUser);

        // Check if the username already exists
        const existingUserByUsername = await User.findOne({ username });

        if (existingUserByUsername) {
            return res.render('register', { error: 'Username already taken' });
        }

        const hashedPassword = hashPassword(password);

        // Create a new user using the User model
        const newUser = new User({
            username,
            password: hashedPassword,
            accountID, // Set the accountID
        });

        // Save the user to the database
        await newUser.save();


        req.session.user = {
            accountID: newUser.accountID,
            username: newUser.username,
        };
        req.session.save();

        res.cookie('user', newUser.username);
        res.cookie('accountID', newUser.accountID);

        // Redirect to the home page or any other desired page
        res.redirect('/home');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error registering user');
    }
});

// Function to generate a random number between min and max (inclusive)
function generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getCurrentDate() {
    const currentDate = new Date();
    return currentDate;
}



// Your existing routes
router.get('/', (req, res) => {
    res.render('home');
});

router.get('/home', async (req, res) => {

    try {
        const searchQuery = req.query.search;

    
        const posts = Post.find().sort({ postedOn: 'desc' });
        let filteredPosts = await posts;


        if (searchQuery) {
            // Case-insensitive search in title and body
            const lowercasedQuery = searchQuery.toLowerCase();

            
            filteredPosts = filteredPosts.filter(
                post =>
                post.title.toLowerCase().includes(lowercasedQuery) ||
                post.body.toLowerCase().includes(lowercasedQuery)
            );
        }

        await Promise.all(filteredPosts.map(async (post) => {
            post.username = await lookupUsername(post.accountID);
            post.user = await User.findOne({ accountID: post.accountID });
        }));

        // Pass the fetched data to the home template
        res.render('home', { posts: filteredPosts, user: req.session.user, searchQuery  });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching posts');
    }
});

 

router.get('/comments', (req, res) => {
    res.render('comments');
});


// Render login form
router.get('/login', (req, res) => {
    res.render('login');
});

// Handle login form submission
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find the user in the database
        const user = await User.findOne({ username });

        if (!user) {
            // User not found
            return res.render('login', { error: 'Invalid username or password' });
        }

        const hashedPassword = hashPassword(password);

        // Check if the password is correct
        const isPasswordValid = (hashedPassword === user.password);

        if (!isPasswordValid) {
            // Incorrect password
            return res.render('login', { error: 'Invalid username or password' });
        }

        // Store the user data in a session
        req.session.user = {
            accountID: user.accountID,
            username: user.username,
        };
        
        // save user data in a cookie
        res.cookie('user', user.username);
        res.cookie('accountID', user.accountID);


        // Redirect to the home page after successful login
        res.redirect('/home');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error during login');
    }
});


router.get('/viewpost', async (req, res) => {
    try {
        const postID = req.query.postID;
        const post = await Post.findOne({ postID });

        if (!post) {
            // Handle case where post is not found
            return res.status(404).send('Post not found');
        }

        // Assuming you want to pass the posts data to the viewpost template
        const posts = await Post.find();

        const replies = await Promise.all(post.replies.map(async (reply) => {
            reply.username = await lookupUsername(reply.accountID);
            return reply;
        }));

        
        // Render the viewpost page with the post and posts data
        res.render('viewpost', { post, posts, user: req.session.user, replies: replies, postID: postID });
    } catch (error) {
        console.error('Error in /viewpost route:', error);
        res.status(500).send('Internal Server Error');
    }
});



router.get('/logout', (req, res) => {
    res.clearCookie('user');
    res.clearCookie('accountID');

    // Destroy the session
    req.session.destroy(err => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error during logout');
        }
        // Redirect to the login page after successful logout
        res.redirect('/login');
    });
});

router.get('/editprofile', (req, res) => {
    res.render('editprofile');
});

router.get('/newpost', (req, res) => {
    res.render('newpost');
});

router.post('/createpost', async (req, res) => {
    const { title, body } = req.body;

    if (!req.session.user) {
        return res.redirect('/login');
    }

    const accountID = req.session.user.accountID;
    const username = req.session.user.username;

    try {
        // Generate a unique postID
        const postID = generateRandomNumber(10000, 99999);

        const newPost = new Post({
            postID,
            accountID,
            title,
            body,
            postedOn: getCurrentDate(),
            lastupdate: getCurrentDate(),
            votes: 0,
            replies: [],
        });

        await newPost.save();

        // Redirect to the home page with the updated posts
        const posts = await Post.find().sort({ postedOn: 'desc' });
        res.render('home', { user: req.session.user, posts });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating post');
    }
});

// Existing route handler for adding comments
router.post('/addcomment', async (req, res) => {
    // Check if the user is logged in
    if (!req.session.user) {
        return res.redirect('/login');
    }

    console.log(req.body)

    const { postID, commentBody } = req.body;
    const accountID = req.session.user.accountID;

    try {
        // Fetch the post
        const post = await Post.findOne({ postID });

        if (!post) {
            return res.status(404).send('Post not found');
        }

        // Add the comment to the post
        const newComment = {
            accountID: accountID,
            body: commentBody,
            datetime: getCurrentDate(),
        };

        post.replies.push(newComment);
        await post.save();

        // Redirect back to the home page or post details page
        res.redirect('/home');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding comment');
    }
});



router.get('/about', (req, res) => {
    return res.render('about');
});



module.exports = router;
