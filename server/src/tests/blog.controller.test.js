const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { app } = require('../app');
const mockConnectDB = require('../db/index');
const Blog = require('../models/blog.model');
const User = require('../models/user.model');

let mongoServer;
let server;
let accessToken;
let refreshToken;

const mockUser = {
    fullName: 'Kishan Kumar',
    email: 'kk4@gmail.com',
    username: 'kk4kk4kk4',
    password: "kk124456"
};

const mockBlog = {
    title: 'Blog 1',
    content: 'Content 1',
    category:'DSA'
};

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mockConnectDB(mongoUri);

    server = app.listen(8001, () => {
        console.log('Server started on port 8002');
    });

    // Register user to obtain tokens for further tests
    const res = await request(app)
        .post('/api/v1/users/register')
        .send(mockUser);
   
},20000);

afterAll(async () => {
    await Blog.deleteMany({});
    await User.deleteMany({});
    if (server) {
        server.close(() => {
            console.log('Server closed');
        });
    }
    await mongoose.connection.close();
    if (mongoServer) {
        await mongoServer.stop();
    }
});


describe('Create Blog Post Endpoint ',  () => {

    test('Positive Test: Create Blog Successfully', async () => {

        const loginRes = await  request(app)
        .post('/api/v1/users/login')
        .send({ email: mockUser.email, password: mockUser.password });

        accessToken = loginRes.body.data.accessToken;
        refreshToken = loginRes.body.data.refreshToken;
        
        const res = await request(app)
            .post('/api/v1/blogs/')
            .set('Authorization', `Bearer ${accessToken}`)
            .field('title', mockBlog.title)
            .field('content', mockBlog.content)
            .field('category',mockBlog.category);
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('message', 'Blog created successfully');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('title', mockBlog.title);
        expect(res.body.data).toHaveProperty('content', mockBlog.content);
        expect(res.body.data).toHaveProperty('category',mockBlog.category);

        const blog = await Blog.findOne({ title: mockBlog.title });
        expect(blog).not.toBeNull();
        expect(blog.title).toBe(mockBlog.title);
        expect(blog.content).toBe(mockBlog.content)
        expect(blog.category).toBe(mockBlog.category);
    }, 20000);

    test('Negative Test(Edge Case): Missing Fields', async () => {
            // Test case where title is missing
            const res = await request(app)
                .post('/api/v1/blogs/')
                .set('Authorization', `Bearer ${accessToken}`)
                .field('content', mockBlog.content);
      
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('message', 'Please provide title, content and category');
      
            // Test case where content is missing
            const res2 = await request(app)
                .post('/api/v1/blogs/')
                .set('Authorization', `Bearer ${accessToken}`)
                .field('title', mockBlog.title);
      
            expect(res2.status).toBe(400);
            expect(res2.body).toHaveProperty('message', 'Please provide title, content and category');
      
            // Test case where both title and content are missing
            const res3 = await request(app)
                .post('/api/v1/blogs/')
                .set('Authorization', `Bearer ${accessToken}`)
                .field('title', '')
                .field('content', '');
      
            expect(res3.status).toBe(400);
            expect(res3.body).toHaveProperty('message', 'Please provide title, content and category');
    }, 20000);

    test('Negative Test(Edge Case): Empty Strings', async () => {
        const res = await request(app)
            .post('/api/v1/blogs/')
            .set('Authorization', `Bearer ${accessToken}`)
            .field('title', '')
            .field('content', '')
            .field('category','');

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Please provide title, content and category');
    });

    test('Negative Test(Edge Case): Too Large title', async () => {
        const res = await request(app)
            .post('/api/v1/blogs/')
            .set('Authorization', `Bearer ${accessToken}`)
            .field('title', 'a'.repeat(101))
            .field('content', mockBlog.content)
            .field('category',mockBlog.category);
    
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Title should be between 3 to 30 characters');

        const blog = await Blog.findOne({ title: 'a'.repeat(101) });
        expect(blog).toBeNull();
    });

    test('Negative Test(Edge Case): Too Large category', async () => {
        const res = await request(app)
            .post('/api/v1/blogs/')
            .set('Authorization', `Bearer ${accessToken}`)
            .field('title', mockBlog.title)
            .field('content', mockBlog.content)
            .field('category','a'.repeat(101));
    
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Category should be between 2 to 30 characters');

        const blog = await Blog.findOne({ category: 'a'.repeat(101) });
        expect(blog).toBeNull();
    });

    test('Negative Test: Unauthorized Access', async () => {
        const res = await request(app)
            .post('/api/v1/blogs/')
            .field('title', mockBlog.title)
            .field('content', mockBlog.content)
            .field('category',mockBlog.category);
    
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
    
        // Invalid token scenario
        const res2 = await request(app)
            .post('/api/v1/blogs/')
            .set('Authorization', 'Bearer invalidToken')
            .field('title', mockBlog.title)
            .field('content', mockBlog.content);
    
        expect(res2.status).toBe(401);
        expect(res2.body).toHaveProperty('message', 'Unauthorized');
    }, 20000);
});


describe('Get Blog Endpoints', () => {
    test('Positive Test: Get Blog Successfully', async () => {
        const res = await request(app)
            .get('/api/v1/blogs/')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'Blogs fetched successfully');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data.blogs).toHaveLength(1);
    }, 20000);

    test('Negative Test: Unauthorized Access', async () => {
        
        // Invalid token scenario
        const res = await request(app)
        .get('/api/v1/blogs/')
        .set('Authorization', 'Bearer invalidToken');
        
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
    }, 20000);

    test('Negative Test: Missing Access Token', async () => {
        const res = await request(app)
            .get('/api/v1/blogs/');
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
    });

    describe('Tests for get blog by id', () => {

        
        test('Positive Test: Get Blog by ID', async () => {
            const blog = await Blog.findOne({ title: mockBlog.title });
            const res = await request(app)
            .get(`/api/v1/blogs/${blog._id}`)
            .set('Authorization', `Bearer ${accessToken}`);
            
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Blog fetched successfully');
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toHaveProperty('title', mockBlog.title);
            expect(res.body.data).toHaveProperty('content', mockBlog.content);
            expect(res.body.data).toHaveProperty('category',mockBlog.category);

        });

        test('Negative Test: invalid blog ID', async () => {
            const res = await request(app)
                .get('/api/v1/blogs/invalidId')
                .set('Authorization', `Bearer ${accessToken}`)
                .send();
            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('message', 'Invalid blog id');
        
            try {
                const blog = await Blog.findOne({ _id: 'invalidId' });
                expect(blog).toBeNull();
            } catch (error) {
                expect(error).toBeInstanceOf(mongoose.Error.CastError);
                expect(error.message).toContain('Cast to ObjectId failed');
            }
        });
        test('Negative Test: Unauthorized Access', async () => {
            const blog = await Blog.findOne({ title: mockBlog.title });
            const res = await request(app)
                .get(`/api/v1/blogs/${blog._id}`)
                .send();
            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('message', 'Unauthorized');

            const res2 = await request(app)
                .get(`/api/v1/blogs/${blog._id}`)
                .set('Authorization', 'Bearer invalidToken');
            expect(res2.status).toBe(401);
            expect(res2.body).toHaveProperty('message', 'Unauthorized');
        });

        
    });
    
    describe('Tests for sorting and filtering', () => {
        const mockBlogs = [
            {
                title: 'Blog 2',
                content: 'Content 2',
                category: 'DSA'
            },
            {
                title: 'Blog 3',
                content: 'Content 3',
                category: 'Web Development'
            },
            {
                title: 'Blog 4',
                content: 'Content 4',
                category: 'DSA'
            },
            {
                title: 'Blog 5',
                content: 'Content 5',
                category: 'Web Development'
            },
        ];

        beforeAll(async () => {
            for(let i of mockBlogs){
                await request(app)
                .post('/api/v1/blogs/')
                .set('Authorization', `Bearer ${accessToken}`)
                .field('title', i.title)
                .field('content', i.content)
                .field('category',i.category);
            }
        });

        test('Positive Test: Sort by Title', async () => {
            const res = await request(app)
                .get('/api/v1/blogs/?sortBy=title')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Blogs fetched successfully');
            expect(res.body).toHaveProperty('data');
            expect(res.body.data.blogs).toHaveLength(5);
            expect(res.body.data.blogs[0].title).toBe('Blog 1');
            expect(res.body.data.blogs[1].title).toBe('Blog 2');
            expect(res.body.data.blogs[2].title).toBe('Blog 3');
            expect(res.body.data.blogs[3].title).toBe('Blog 4');
            expect(res.body.data.blogs[4].title).toBe('Blog 5');
        }, 20000);

        test('Positive Test: Sort by Category', async () => {
            const res = await request(app)
                .get('/api/v1/blogs/?sortBy=category')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Blogs fetched successfully');
            expect(res.body).toHaveProperty('data');
            expect(res.body.data.blogs).toHaveLength(5);
            expect(res.body.data.blogs[0].category).toBe('DSA');
            expect(res.body.data.blogs[1].category).toBe('DSA');
            expect(res.body.data.blogs[2].category).toBe('DSA');
            expect(res.body.data.blogs[3].category).toBe('Web Development');
            expect(res.body.data.blogs[4].category).toBe('Web Development');
        });

        test('Edge Case: Invalid Sort Field', async () => {
            const res = await request(app)
                .get('/api/v1/blogs/?sortBy=invalidField')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Blogs fetched successfully');
            expect(res.body).toHaveProperty('data');
            expect(res.body.data.blogs).toHaveLength(5);
            const blog = await Blog.findOne({category:'invalidField'});
            expect(blog).toBeNull();
        });


        test('Positive Test: Filter by startDate', async () => {
            const res = await request(app)
                .get('/api/v1/blogs/?startDate=2021-10-01')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Blogs fetched successfully');
            expect(res.body).toHaveProperty('data');
            expect(res.body.data.blogs).toHaveLength(5);
        });
        test('Positive Test: Filter by endDate', async()=>{
            const res = await request(app)
            .get('/api/v1/blogs/?endDate=2025-10-01')
            .set('Authorization', `Bearer ${accessToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Blogs fetched successfully');
            expect(res.body).toHaveProperty('data');
            expect(res.body.data.blogs).toHaveLength(5);

        });
        test('Positive Test: Filter by both startDate and endDate', async()=>{
            const res = await request(app)
            .get('/api/v1/blogs/?endDate=2025-10-01&startDate=2021-10-01')
            .set('Authorization', `Bearer ${accessToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message', 'Blogs fetched successfully');
            expect(res.body).toHaveProperty('data');
            expect(res.body.data.blogs).toHaveLength(5);
        })

        test('Negative Test(Edge Case): Filter by endDate before startDate', async()=>{
            const res = await request(app)
            .get('/api/v1/blogs/?endDate=2021-10-01&startDate=2025-10-01')
            .set('Authorization', `Bearer ${accessToken}`);
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('message', 'No blogs found');
        });

        test('Negative Test: Filter by invalid startDate', async()=>{
            const res = await request(app)
            .get('/api/v1/blogs/?startDate=invalidDate')
            .set('Authorization', `Bearer ${accessToken}`);
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('message', 'Invalid start date');
        });

        test('Negative Test: Filter by invalid endDate', async()=>{
            const res = await request(app)
            .get('/api/v1/blogs/?endDate=invalidDate')
            .set('Authorization', `Bearer ${accessToken}`);
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('message', 'Invalid end date');
        });

        test('Positve Test: Filter by Category',async()=>{
            const res= await request(app)
            .get('/api/v1/blogs/?category=DSA')
            .set('Authorization', `Bearer ${accessToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body.data.blogs).toHaveLength(3);
            for(let i of res.body.data.blogs){
                expect(i.category).toBe('DSA'); 
            }
        })

        test('Negative Test(Edge Case): Filter by invalid Category',async()=>{
            const res= await request(app)
            .get('/api/v1/blogs/?category=invalidCategory')
            .set('Authorization', `Bearer ${accessToken}`);
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('message','No blogs found');
        });

        test('Positive Test: Pagination', async()=>{
            const res= await request(app)
            .get('/api/v1/blogs/?limit=3&page=1')
            .set('Authorization', `Bearer ${accessToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body.data.blogs).toHaveLength(3);
            expect(res.body.data).toHaveProperty('currentPage',1);
            expect(res.body.data).toHaveProperty('totalPages',2);
        })
        test('Negative Test: Pagination with invalid page', async()=>{
            const res= await request(app)
            .get('/api/v1/blogs/?limit=3&page=3')
            .set('Authorization', `Bearer ${accessToken}`);
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('message','No blogs found');
        });
    });
},20000);


describe('Update Blog Endpoints', () => {
    test('Positive Test: Update Blog Successfully', async () => {
        const blog = await Blog.findOne({ title: mockBlog.title });
        const res = await request(app)
            .patch(`/api/v1/blogs/${blog._id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ content: 'Updated Content'});

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'Blog updated successfully');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('title', mockBlog.title);
        expect(res.body.data).toHaveProperty('content', 'Updated Content');
        expect(res.body.data).toHaveProperty('category',mockBlog.category);

        const updatedBlog = await Blog.findOne({ title: mockBlog.title });
        expect(updatedBlog).not.toBeNull();
        expect(updatedBlog.title).toBe(mockBlog.title);
        expect(updatedBlog.content).toBe('Updated Content');
        expect(updatedBlog.category).toBe(mockBlog.category);
    }, 20000);

    test('Positve Test: Update Blog with two fields', async()=>{
        let blog = await Blog.findOne({ title: mockBlog.title });
        const res = await request(app)
            .patch(`/api/v1/blogs/${blog._id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ content: 'Updated Content', category: 'Updated Category'});
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'Blog updated successfully');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('title', mockBlog.title);
        expect(res.body.data).toHaveProperty('content', 'Updated Content');
        expect(res.body.data).toHaveProperty('category','Updated Category');

        blog= await Blog.findOne({title:mockBlog.title});
        expect(blog).not.toBeNull();
        expect(blog.title).toBe(mockBlog.title);
        expect(blog.content).toBe('Updated Content');
        expect(blog.category).toBe('Updated Category');
    },20000);

    test('Negative Test: Invalid Blog ID', async () => {
        const res = await request(app)
            .patch('/api/v1/blogs/invalidId')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ content: 'Updated Content' });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('message', 'Invalid blog id');

    });

    test('Negative Test(Edge Case): Empty Strings', async () => {
        const blog = await Blog.findOne({ title: mockBlog.title });
        const res = await request(app)
            .patch(`/api/v1/blogs/${blog._id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ content: '', category: '' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Please provide at least one field to update');

        const blog2= await Blog.findOne({title:mockBlog.title});
        expect(blog2).not.toBeNull();
        expect(blog2.title).toBe(blog.title);
        expect(blog2.content).toBe(blog.content);
        expect(blog2.category).toBe(blog.category);
    });

    test('Negative Test(Edge Case): Missing Fields', async () => {
        const blog = await Blog.findOne({ title: mockBlog.title });
        const res = await request(app)
            .patch(`/api/v1/blogs/${blog._id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Please provide at least one field to update');

        const blog2= await Blog.findOne({title:mockBlog.title});
        expect(blog2).not.toBeNull();
        expect(blog2.title).toBe(blog.title);
        expect(blog2.content).toBe(blog.content);
        expect(blog2.category).toBe(blog.category);
    });

    test('Negative Test(Edge Case): Too Large title', async () => {
        const blog = await Blog.findOne({ title: mockBlog.title });
        const res = await request(app)
            .patch(`/api/v1/blogs/${blog._id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ title: 'a'.repeat(101) });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Title should be between 3 to 30 characters');
        const blog2 = await Blog.findOne({ title: 'a'.repeat(101) });
        expect(blog2).toBeNull();
    });

    test('Negative Test(Edge Case): Too Large Category', async () => {
        const blog = await Blog.findOne({ title: mockBlog.title });
        const res = await request(app)
            .patch(`/api/v1/blogs/${blog._id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ category: 'a'.repeat(101) });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Category should be between 2 to 30 characters');
        const blog2 = await Blog.findOne({ title: mockBlog.title });
        expect(blog2).not.toBeNull();
        expect(blog2.title).toBe(blog.title);
        expect(blog2.content).toBe(blog.content);
        expect(blog2.category).toBe(blog.category);

    });

    test('Negative Test(Edge Case): Null Fields', async () => {
        const blog = await Blog.findOne({ title: mockBlog.title });
        const res = await request(app)
            .patch(`/api/v1/blogs/${blog._id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ content: null, category: null });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message', 'Please provide at least one field to update');
        const blog2= await Blog.findOne({title:mockBlog.title});
        expect(blog2).not.toBeNull();
        expect(blog2.title).toBe(blog.title);
        expect(blog2.content).toBe(blog.content);
        expect(blog2.category).toBe(blog.category);
    });

    test('Negative Test: Unauthorized Access', async () => {
        const blog = await Blog.findOne({ title: mockBlog.title });
        const res = await request(app)
            .patch(`/api/v1/blogs/${blog._id}`)
            .send({ content: 'Updated Content' });

        expect(res.status).toBe(401);
        expect(res.error).toHaveProperty('message',  `cannot PATCH /api/v1/blogs/${blog._id} (401)`);
        
        const blog2= await Blog.findOne({title:mockBlog.title});
        expect(blog2).not.toBeNull();
        expect(blog2.title).toBe(blog.title);
        expect(blog2.content).toBe(blog.content);
        expect(blog2.category).toBe(blog.category);

        // Invalid token scenario
        const res2 = await request(app)
            .patch(`/api/v1/blogs/${blog._id}`)
            .set('Authorization', 'Bearer invalidToken')
            .send({ content: 'Updated Content' });

        expect(res2.status).toBe(401);
        expect(res2.error).toHaveProperty('message',  `cannot PATCH /api/v1/blogs/${blog._id} (401)`);

        const blog3= await Blog.findOne({title:mockBlog.title});
        expect(blog3).not.toBeNull();
        expect(blog3.title).toBe(blog.title);
        expect(blog3.content).toBe(blog.content);
        expect(blog3.category).toBe(blog.category);
    }, 20000);
});

describe('Delete Blog Endpoints', () => {
    


    test('Negative Test: Invalid Blog ID', async () => {
        const res = await request(app)
            .delete('/api/v1/blogs/invalidId')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('message', 'Invalid blog id');
    });

    test('Negative Test: Unauthorized Access', async () => {
        const blog = await Blog.findOne({ title: mockBlog.title });
        const res = await request(app)
            .delete(`/api/v1/blogs/${blog._id}`);
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized');
        const blog2= await Blog.findOne({title:mockBlog.title});
        expect(blog2).not.toBeNull();
        expect(blog2.title).toBe(blog.title);
        expect(blog2.content).toBe(blog.content);
        expect(blog2.category).toBe(blog.category);
    });

    test('Positive Test: Delete Blog Successfully', async () => {
        let blog = await Blog.findOne({ title: mockBlog.title });
        const res = await request(app)
            .delete(`/api/v1/blogs/${blog._id}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'Blog deleted successfully');
        blog = await Blog.findOne({ title: mockBlog.title });
        expect(blog).toBeNull();
    },20000);
});


describe("Data Integrity Test",()=>{
    mockBlogDI={
        title: 'Blog 6',
        content: 'Content 6',
        category:'CP'
    }
    test("Positive Test : to create a blog",async()=>{
        const blog = await request(app)
        .post('/api/v1/blogs/')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('title', mockBlogDI.title)
        .field('content', mockBlogDI.content)
        .field('category',mockBlogDI.category);
        expect(blog.status).toBe(201);
        expect(blog.body).toHaveProperty('message', 'Blog created successfully');
        expect(blog.body).toHaveProperty('data');
        expect(blog.body.data).toHaveProperty('title', mockBlogDI.title);
        expect(blog.body.data).toHaveProperty('content', mockBlogDI.content);
        expect(blog.body.data).toHaveProperty('category',mockBlogDI.category);

        const blog1 = await Blog.findOne({ title: mockBlogDI.title });
        expect(blog1).not.toBeNull();
        expect(blog1.title).toBe(mockBlogDI.title);
        expect(blog1.content).toBe(mockBlogDI.content);
        expect(blog1.category).toBe(mockBlogDI.category);
        
    });

    test("Postive Test : to get blog by id",async()=>{
        const blog = await Blog.findOne({ title: mockBlogDI.title });
        const res = await request(app)
            .get(`/api/v1/blogs/${blog._id}`)
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'Blog fetched successfully');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('title', mockBlogDI.title);
        expect(res.body.data).toHaveProperty('content', mockBlogDI.content);
        expect(res.body.data).toHaveProperty('category',mockBlogDI.category);
    });

    test("Positive Test : to update a blog",async()=>{
        let blog = await Blog.findOne({ title: mockBlogDI.title }); 
        const res = await request(app)
            .patch(`/api/v1/blogs/${blog._id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ content: 'Updated Content'});
        
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'Blog updated successfully');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('title', mockBlogDI.title);
        expect(res.body.data).toHaveProperty('content', 'Updated Content');
        expect(res.body.data).toHaveProperty('category',mockBlogDI.category);

        blog = await Blog.findOne({ title: mockBlogDI.title });
        expect(blog).not.toBeNull();
        expect(blog.title).toBe(mockBlogDI.title);
        expect(blog.content).toBe('Updated Content');
        expect(blog.category).toBe(mockBlogDI.category);
    });

    test('Positive Test: Delete Blog Successfully', async () => {
        let blog = await Blog.findOne({ title: mockBlogDI.title });
        const res = await request(app)
            .delete(`/api/v1/blogs/${blog._id}`)
            .set('Authorization', `Bearer ${accessToken}`);
        
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'Blog deleted successfully');
        blog = await Blog.findOne({ title: mockBlogDI.title });
        expect(blog).toBeNull();
    });

});