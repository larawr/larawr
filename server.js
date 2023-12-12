// server.js
const dotenv = require('dotenv');
dotenv.config();

const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');
const express = require('express');
const app = express();
const exphbs = require('express-handlebars');
const Handlebars = require('handlebars'); // Import the handlebars library
const connect = require('./src/models/db.js');
const router = require('./src/routes/router.js');
const session = require('express-session');
const User = require('./src/models/user'); // Import the User model
const Post = require('./src/models/post');


// Define lookupUsername before main

async function lookupUsername(accountID) {
    try {
        const user = await User.findOne({ accountID });
        return user ? user.username : 'Unknown User';
    } catch (error) {
        console.error('Error looking up username:', error);
        throw error; // Make sure to propagate the error
    }
}


Handlebars.registerHelper('await', function(promise) {
    return promise.fn(this);
});

Handlebars.registerHelper('lookupUsernameAsync', async function (accountID, options) {
    try {
        const username = await lookupUsername(accountID);
        return options.fn(username);
    } catch (error) {
        console.error('Error looking up username:', error);
        return options.inverse('Unknown User');
    }
});


async function createUser(username, password, accountID) {
    try {
        const user = new User({ username, password, accountID });
        await user.save();
        console.log(`User ${username} created successfully.`);
    } catch (error) {
        console.error(`Error creating user ${username}:`, error);
    }
}


async function createPost(title, body, accountID, postID, replies = []) {
    try {
        // Check if a post with the same postID already exists
        const existingPost = await Post.findOne({ postID });
        
        if (existingPost) {
            console.log(`Post with postID ${postID} already exists. Skipping creation.`);
            return;
        }

        // If the post doesn't exist, create and save it
        const post = new Post({
            title,
            body,
            postedOn: new Date(),
            accountID,
            postID,
            replies,
        });
        await post.save();
        console.log(`Post with postID ${postID} created successfully.`);
    } catch (error) {
        console.error(`Error creating post with postID ${postID}:`, error);
    }
}




module.exports = { lookupUsername };

async function main() {
    

    app.use('/static', express.static('public'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Configure express-session middleware
    const crypto = require('crypto');
    const sessionSecret = crypto.randomBytes(64).toString('hex');

    app.use(session({
        secret: sessionSecret,
        resave: false,
        saveUninitialized: true
    }));

    const isAuthenticated = (req, res, next) => {
        // userId from cookie
        const userId = res.cookie.userId;
        if (userId || (req.session && req.session.userId)) {
            return next();
        } else {
            return res.redirect('/login'); // Redirect to login if not authenticated
        }
    };

        // Apply isAuthenticated middleware to routes that require authentication
        app.get('/profile', isAuthenticated, async (req, res) => {
            // This route requires authentication, and only authenticated users will reach here
            // Handle rendering the user's profile or performing other authenticated actions
            try {
                // Fetch user data or perform actions specific to authenticated users
                const userId = req.session.userId;
                const user = await User.findById(userId);
                
                // Render the user's profile or perform other actions
                res.render('profile', { user });
            } catch (error) {
                console.error('Error in /profile route:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        app.get('/', async (req, res) => {
            // Render home page or list of posts, accessible to all users
            try {
                // Example: Fetch a list of posts from the database
                const posts = await Post.find();
                
                // Render the home page with the list of posts
                res.render('home', { posts });
            } catch (error) {
                console.error('Error in / route:', error);
                res.status(500).send('Internal Server Error');
            }
        });

    const hbs = exphbs.create({
        extname: "hbs",
        handlebars: allowInsecurePrototypeAccess(Handlebars),
        helpers: {
            formatDate: function (date) {
                if (date instanceof Date && !isNaN(date)) {
                    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                } else {
                    return 'Unknown Date';
                }
            },
            lookupUsername: lookupUsername,
            await: function (promise) {
                return promise.then((data) => new Handlebars.SafeString(data));
            },
        },
    });

    app.engine("hbs", hbs.engine);
    app.set("view engine", "hbs");
    app.set("views", "./src/views");

    // Apply routes to express app
    app.use(router);

    try {
        await connect();
        console.log(`Now connected to MongoDB`);


        // Insert hardcoded users into the database
        const hardcodedUsers = [
            {
                username: 'TechW',
                password: '12345',
                accountID: 0,
                displayname: 'TechW',
                description: 'They see me Coding, They Hatin',
                posts: [0],
                comments: [
                    { postID: 1, comment_num: 0},
                ],
            },
            {
                username: 'Weismann',
                password: '12345',
                accountID: 1,
                displayname: 'Weismann',
                description: 'They see me Coding, They Hatin',
                posts: [1],
                comments: [
                    { postID: 0, comment_num: 0 },
                ],
            },
            {
                username: 'Alandal',
                password: '12345',
                accountID: 2,
                displayname: 'Alandal',
                description: 'They see me Coding, They Hatin',
                posts: [2],
                comments: [
                    { postID: 0, comment_num: 1 },
                ],
            },
            {
                username: 'Skipee',
                password: '12345',
                accountID: 3,
                displayname: 'Skipee',
                description: 'They see me Coding, They Hatin',
                posts: [3],
                comments: [
                    { postID: 0, comment_num: 2 },
                ],
            },
            {
                username: 'Findo',
                password: '12345',
                accountID: 4,
                displayname: 'Findo',
                description: 'They see me Coding, They Hatin',
                posts: [4],
                comments: [
                    { postID: 1, comment_num: 3 },
                ],
            },
        ];

        for (const user of hardcodedUsers) {
            await createUser(user.username, user.password, user.accountID);
        }

        const hardcodedPosts = [
            {
                title: 'How to learn web development from scratch?',
                body: 'As the title says. Been interested in starting to learn coding for various use cases. I want to know how exactly I start like what programming language I should learn or what software I should use?',
                accountID: 0,
                postID: 0,
                replies: [
                    { accountID: 1, body: 'Try learning python, it has a very simple syntax', datetime: '20231005T104523-0400' },
                    { accountID: 2, body: 'You should probably start with something more straightforward like C. For the IDE, I generally use Sublime Text but that\'s just my preference', datetime: '20231005T113523-0400' },
                    { accountID: 3, body: 'For the IDE you have got to go with VSCode due to how flexible it is. For the language, probably either C or Java.', datetime: '20231005T114043-0400' },
                    { accountID: 4, body: 'Definitely Java and use NetBeans for your IDE', datetime: '20231005T114143-0400"' }
                ],
            },
            {
                title: 'Tips for debugging JavaScript',
                body: 'Do you have any tips on debugging JavaScript? My mind is going crazy because of some bugs I can\'t find',
                accountID: 1,
                postID: 1,
                replies: [
                    { accountID: 0, body: 'You can use console.log() to check if your code works', datetime: '20231005T104523-0400' },
                    { accountID: 3, body: 'Use Breakpoints in the Browser Debugger: You can set breakpoints in your code, which will pause execution at that point, allowing you to inspect the current state.', datetime: '20231005T113523-0400' },
                    { accountID: 2, body: 'Use the JavaScript debugger Statement: Similar to breakpoints, you can place a debugger; line in your code. Chrome will automatically stop there when executing2..', datetime: '20231005T114043-0400' },
                    { accountID: 4, body: 'Utilize Error Messages for Bug Identification: Pay close attention to any error messages that appear in your console, as they can provide valuable clues about what’s going wrong1.', datetime: '20231005T114143-0400' },
                ],
            },
            {
                title: 'Best CSS frameworks for responsive design',
                body: 'What is the best CSS framework for responsive design you use? I\'m currently using Bootstrap',
                accountID: 2,
                postID: 2,
                replies: [
                    { accountID: 0, body: 'In my 10 years of experience I use Bootstrap and I haven\'t encountered some problems', datetime: '20231005T104523-0400' },
                    { accountID: 1, body: 'I Agree With TechW I also use Bootstrap', datetime: '20231005T113523-0400' },
                    { accountID: 3, body: 'For me, Tailwind - Tailwind offers a modern utility-based approach for building responsive sites. It has a vast amount of utility classes that can let you build modern websites without writing CSS.', datetime: '20231005T114043-0400' },
                    { accountID: 4, body: 'I used Tachyons this is another utility-based CSS library that does the heavy lifting of offering many styles out of the box so you don’t need to write a lot of CSS yourself.', datetime: '20231005T114143-0400' },
                ],
            },
            {
                title: 'Python vs Java for Web Development',
                body: 'Hello, I\'m new to web development and trying to decide whether to learn Python (Django/Flask) or Java (Spring) for backend development. Can anyone provide some pros and cons for both? Thanks!',
                accountID: 3,
                postID: 3,
                replies: [
                    { accountID: 0, body: 'I\'ve worked with both and I personally prefer Python (Django/Flask). It\'s easier to learn and the syntax is cleaner.', datetime: '20231005T104523-0400' },
                    { accountID: 1, body: 'Java (Spring) is a robust language and it\'s widely used in large scale applications. If you\'re planning to work in a big tech company, having Java in your skill set could be beneficial.', datetime: '20231005T113523-0400' },
                    { accountID: 2, body: 'If you\'re new to programming, I would recommend Python because of its simplicity. However, learning Java will give you a deeper understanding of programming concepts.', datetime: '20231005T114043-0400' },
                    { accountID: 4, body: 'In terms of performance, Java is generally faster. However, Python is usually more than fast enough for web development and its simplicity can lead to faster development times.', datetime: '20231005T114143-0400' },
                ],
            },
            {
                title: 'Cybersecurity Resources Needed',
                body: 'Greetings everyone, I\'m looking to learn more about cybersecurity. Can anyone recommend some good online courses, books, or other resources? Your help would be greatly appreciated!',
                accountID: 4,
                postID: 4,
                replies: [
                    { accountID: 0, body: 'I would recommend the Introduction to Cybersecurity course on Coursera. It\'s a great starting point for beginners and covers a wide range of topics.', datetime: '20231005T104523-0400' },
                    { accountID: 1, body: 'Check out the cybersecurity courses on edX. They have a variety of courses ranging from beginner to advanced levels.', datetime: '20231005T113523-0400' },
                    { accountID: 2, body: 'The Art of Invisibility by Kevin Mitnick is a great book that provides real-world examples and practical advice on cybersecurity.', datetime: '20231005T114043-0400' },
                    { accountID: 3, body: 'For hands-on practice, try Hack The Box. It\'s an online platform that allows you to test your penetration testing skills.', datetime: '20231005T114143-0400' },
                ],
            },
        ];
        
        for (const post of hardcodedPosts) {
            await createPost(post.title, post.body, post.accountID, post.postID, post.comments);
        }

        
    } catch (err) {
        console.log('Connection to MongoDB failed: ');
        console.error(err);
    }

// Start the server outside the try block
const port = process.env.SERVER_PORT || 3000;
app.listen(port, () => {
    console.log(`express app is now listening on port ${port}`);
});
}

main();


