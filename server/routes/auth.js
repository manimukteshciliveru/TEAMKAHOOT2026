const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');
const { check, validationResult } = require('express-validator');
const { escapeRegExp } = require('../utils/helpers');

// Stricter limiter for auth routes
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 requests per windowMs
    message: 'Too many auth attempts from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
});

// Register User
router.post(
    '/register',
    [
        authLimiter,
        check('name', 'Name is required').not().isEmpty(),
        check('identifier', 'Identifier is required').not().isEmpty(),
        check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, identifier, password } = req.body;

    try {
        // Check if user already exists (Case-Insensitive)
        let user = await User.findOne({
            $or: [
                { rollNumber: { $regex: new RegExp(`^${escapeRegExp(identifier)}$`, 'i') } },
                { employeeId: { $regex: new RegExp(`^${escapeRegExp(identifier)}$`, 'i') } }
            ]
        });

        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({
            name,
            password,
            role: 'none' // Default role, user will select later
        });

        // Determine if identifier is rollNumber or employeeId
        // Basic heuristic: if it contains 'BD' or similar student patterns, or starts with numbers
        if (/^\d|.*BD.*/i.test(identifier)) {
            user.rollNumber = identifier;
        } else {
            user.employeeId = identifier;
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 3600000 // 1 hour
                });
                res.json({ token, role: user.role });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Login User
router.post(
    '/login',
    [
        authLimiter,
        check('identifier', 'Identifier is required').exists(),
        check('password', 'Password is required').exists()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { identifier, password } = req.body;

    try {
        // Search by rollNumber or employeeId (Case-Insensitive)
        let user = await User.findOne({
            $or: [
                { rollNumber: { $regex: new RegExp(`^${escapeRegExp(identifier)}$`, 'i') } },
                { employeeId: { $regex: new RegExp(`^${escapeRegExp(identifier)}$`, 'i') } }
            ]
        });



        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 3600000 // 1 hour
                });
                res.json({ token, role: user.role });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
});

// Get User
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

// Logout User
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ msg: 'Logged out successfully' });
});

// Set Role (Only once)
router.post('/set-role', auth, async (req, res) => {
    const { role } = req.body;

    if (!['faculty', 'student', 'admin'].includes(role)) {
        return res.status(400).json({ msg: 'Invalid role' });
    }

    try {
        let user = await User.findById(req.user.id);

        if (user.role !== 'none') {
            return res.status(400).json({ msg: 'Role already set. Cannot change.' });
        }

        user.role = role;
        await user.save();

        // Update token with new role? Or just rely on DB check next time.
        // Ideally reissue token.
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 3600000 // 1 hour
                });
                res.json({ token, role: user.role });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

// Admin Create User
router.post('/create-user', auth, async (req, res) => {
    const { name, password, role, rollNumber, employeeId, branch, section } = req.body;

    try {
        // Check if requester is admin
        const requester = await User.findById(req.user.id);
        if (requester.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }

        if (!['faculty', 'student'].includes(role)) {
            return res.status(400).json({ msg: 'Invalid role' });
        }

        let user = await User.findOne({ 
            $or: [
                { rollNumber: rollNumber || 'NONE' }, 
                { employeeId: employeeId || 'NONE' }
            ] 
        });

        if (user) {
            return res.status(400).json({ msg: 'User already exists with this ID' });
        }

        user = new User({
            name,
            password,
            role,
            rollNumber,
            employeeId,
            branch,
            section
        });




        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        res.json({ msg: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully` });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Admin Get All Users
router.get('/users', auth, async (req, res) => {
    try {
        const requester = await User.findById(req.user.id);
        if (requester.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }

        const users = await User.find({ role: { $ne: 'admin' } }).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Admin Update User
router.put('/user/:id', auth, async (req, res) => {
    const { name, role, status, rollNumber, employeeId, branch, section, password } = req.body;
    try {
        const requester = await User.findById(req.user.id);
        if (requester.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }

        let user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        if (name) user.name = name;
        if (role) user.role = role;
        if (status) user.status = status;
        if (rollNumber) user.rollNumber = rollNumber;
        if (employeeId) user.employeeId = employeeId;
        if (branch) user.branch = branch;
        if (section) user.section = section;

        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();
        res.json(user);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Admin Delete User
router.delete('/user/:id', auth, async (req, res) => {
    try {
        const requester = await User.findById(req.user.id);
        if (requester.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: 'User removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Change Password (User self-service)
router.put('/change-password', auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Incorrect current password' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ msg: 'Password updated successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Bulk Create Users
router.post('/bulk-create-users', auth, async (req, res) => {
    const { users: usersData } = req.body;

    try {
        const requester = await User.findById(req.user.id);
        if (requester.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admin only.' });
        }

        if (!Array.isArray(usersData)) {
            return res.status(400).json({ msg: 'Invalid data format. Expected an array of users.' });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        const salt = await bcrypt.genSalt(10);

        for (const userData of usersData) {
            try {
                const { name, password, role, rollNumber, employeeId, branch, section } = userData;
                
                // Basic validation
                if (!password || !role || (!rollNumber && !employeeId)) {
                    throw new Error(`Missing required fields for user: ${name || 'Unknown'}`);
                }

                // Check if user already exists
                let existingUser = await User.findOne({ 
                    $or: [
                        { rollNumber: rollNumber || 'NONE' }, 
                        { employeeId: employeeId || 'NONE' }
                    ] 
                });

                if (existingUser) {
                    throw new Error(`User already exists with ID: ${rollNumber || employeeId}`);
                }

                const newUser = new User({
                    name,
                    password,
                    role,
                    rollNumber,
                    employeeId,
                    branch,
                    section
                });

                newUser.password = await bcrypt.hash(password.toString(), salt);
                await newUser.save();
                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push(err.message);
            }
        }

        res.json({
            msg: `Bulk creation complete. ${results.success} succeeded, ${results.failed} failed.`,
            results
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get All Students (for Faculty quiz creation)
router.get('/students', auth, async (req, res) => {
    try {
        const requester = await User.findById(req.user.id);
        if (requester.role !== 'faculty' && requester.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Faculty only.' });
        }

        const students = await User.find({ role: 'student' }).select('-password').sort({ section: 1, name: 1 });
        res.json(students);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;


