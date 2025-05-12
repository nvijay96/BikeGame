class Game {
    constructor() {
        // Bind the gameLoop method to maintain correct 'this' context
        this.gameLoop = this.gameLoop.bind(this);
        
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Game state
        this.score = 0;
        this.distance = 0;
        this.level = 1;
        this.gameOver = false;
        this.gameStarted = false;
        this.difficulty = 'medium';
        this.powerUp = null;
        this.isInvincible = false;
        this.speed = 5;
        
        // Road properties
        this.roadWidth = 500;
        this.roadLeft = (800 - this.roadWidth) / 2;
        this.lanes = [
            this.roadLeft + this.roadWidth * 0.125,  // New leftmost lane
            this.roadLeft + this.roadWidth * 0.375,  // Adjusted second lane
            this.roadLeft + this.roadWidth * 0.625,  // Adjusted third lane
            this.roadLeft + this.roadWidth * 0.875   // New rightmost lane
        ];
        
        // Player bike
        this.bike = new Bike(this.lanes[1] - 20, this.canvas.height - 100);
        
        // Game objects
        this.vehicles = [];
        this.zombies = [];
        this.powerUps = [];
        
        // Initialize game objects array
        this.gameObjects = [];
        
        // Add road animation properties
        this.roadOffset = 0;
        this.roadSpeed = 2;
        
        // Add score multiplier system
        this.scoreMultiplier = 1;
        this.multiplierTimer = 0;
        this.multiplierDuration = 300; // 5 seconds at 60fps
        
        // Enhanced difficulty progression
        this.difficultySettings = {
            easy: { 
                vehicleSpeed: 2 + (this.level * 0.2),
                spawnRate: 0.005 + (this.level * 0.001), // Reduced spawn rate for easy mode
                powerUpRate: 0.01
            },
            medium: { 
                vehicleSpeed: 3 + (this.level * 0.3),
                spawnRate: 0.015 + (this.level * 0.003),
                powerUpRate: 0.008
            },
            hard: { 
                vehicleSpeed: 4 + (this.level * 0.4),
                spawnRate: 0.02 + (this.level * 0.004),
                powerUpRate: 0.005
            }
        };
        
        // Initialize keys
        this.keys = {
            left: false,
            right: false,
            up: false,
            shift: false  // For boost
        };
        
        // Add keyboard event listeners
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    handleKeyDown(e) {
        switch(e.key) {
            case 'ArrowLeft':
                this.keys.left = true;
                break;
            case 'ArrowRight':
                this.keys.right = true;
                break;
            case 'ArrowUp':
            case ' ':  // Space bar
                this.keys.up = true;
                break;
            case 'Shift':
                this.keys.shift = true;
                if (this.bike.boost.cooldown === 0) {
                    this.bike.boost.isActive = true;
                }
                break;
        }
    }

    handleKeyUp(e) {
        switch(e.key) {
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'ArrowRight':
                this.keys.right = false;
                break;
            case 'ArrowUp':
            case ' ':  // Space bar
                this.keys.up = false;
                break;
            case 'Shift':
                this.keys.shift = false;
                this.bike.boost.isActive = false;
                break;
        }
    }

    drawBike(x, y, alpha = 1, lean = 0) {
        this.ctx.save();
        this.ctx.translate(x + this.bike.width / 2, y + this.bike.height / 2);
        this.ctx.rotate((lean * Math.PI) / 180);
        this.ctx.globalAlpha = alpha;

        // Draw shadow under bike
        this.ctx.restore();
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(x + this.bike.width/2, y + this.bike.height - 5, 20, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.save();
        this.ctx.translate(x + this.bike.width / 2, y + this.bike.height / 2);
        this.ctx.rotate((lean * Math.PI) / 180);

        // Chrome effect for metallic parts
        const gradient = this.ctx.createLinearGradient(-20, -20, 20, 20);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#a8a8a8');
        gradient.addColorStop(1, '#ffffff');

        // Main frame (more detailed)
        this.ctx.strokeStyle = this.bike.color;
        this.ctx.lineWidth = 4;
        
        // Main frame tube (now with gradient for metallic effect)
        this.ctx.strokeStyle = gradient;
        this.ctx.beginPath();
        this.ctx.moveTo(-15, 10);  // Bottom
        this.ctx.lineTo(0, -20);   // Top
        this.ctx.lineTo(15, 10);   // Bottom right
        this.ctx.stroke();

        // Additional frame detail
        this.ctx.strokeStyle = this.bike.color;
        this.ctx.beginPath();
        this.ctx.moveTo(-8, 0);
        this.ctx.lineTo(8, 0);
        this.ctx.stroke();

        // Handlebars with chrome effect
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(-15, -15);
        this.ctx.quadraticCurveTo(-12, -18, -8, -15);
        this.ctx.moveTo(15, -15);
        this.ctx.quadraticCurveTo(12, -18, 8, -15);
        this.ctx.stroke();

        // Front fork with suspension detail
        this.ctx.strokeStyle = gradient;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -15);
        this.ctx.lineTo(-2, -5);
        this.ctx.lineTo(-2, 15);
        this.ctx.moveTo(0, -15);
        this.ctx.lineTo(2, -5);
        this.ctx.lineTo(2, 15);
        this.ctx.stroke();

        // Wheels with better details
        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.lineWidth = 2;
        
        // Tires (black rubber effect)
        this.ctx.fillStyle = '#1a1a1a';
        
        // Front wheel
        this.ctx.beginPath();
        this.ctx.arc(0, 20, 12, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 20, 10, 0, Math.PI * 2);
        // Add chrome rim and spokes
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            this.ctx.moveTo(0, 20);
            this.ctx.lineTo(
                10 * Math.cos(angle),
                20 + 10 * Math.sin(angle)
            );
        }
        this.ctx.stroke();

        // Back wheel
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.beginPath();
        this.ctx.arc(0, -20, 12, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, -20, 10, 0, Math.PI * 2);
        // Add chrome rim and spokes
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            this.ctx.moveTo(0, -20);
            this.ctx.lineTo(
                10 * Math.cos(angle),
                -20 + 10 * Math.sin(angle)
            );
        }
        this.ctx.stroke();

        // Rider with more detail
        this.ctx.fillStyle = '#34495e';
        // Body with slight lean into direction
        this.ctx.save();
        this.ctx.rotate((lean * Math.PI) / 360); // Rider leans half as much as bike
        this.ctx.fillRect(-6, -30, 12, 20);
        
        // Head with helmet
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.beginPath();
        this.ctx.arc(0, -35, 8, 0, Math.PI * 2);
        this.ctx.fill();
        // Helmet shine
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.beginPath();
        this.ctx.arc(-2, -37, 4, 0, Math.PI);
        this.ctx.stroke();
        
        // Arms with jacket detail
        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(-6, -25);
        this.ctx.lineTo(-15, -15);
        this.ctx.moveTo(6, -25);
        this.ctx.lineTo(15, -15);
        this.ctx.stroke();
        
        this.ctx.restore();

        // Add reflection/shine to the frame
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(-12, 8);
        this.ctx.lineTo(-2, -15);
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawVehicle(vehicle) {
        this.ctx.save();
        
        // Draw shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(
            vehicle.x + vehicle.width/2,
            vehicle.y + vehicle.height - 5,
            vehicle.width/3,
            10,
            0,
            0,
            Math.PI * 2
        );
        this.ctx.fill();

        // Draw vehicle body
        this.ctx.fillStyle = vehicle.color;
        this.ctx.fillRect(vehicle.x, vehicle.y, vehicle.width, vehicle.height);

        // Draw windows and details based on vehicle type
        switch(vehicle.type) {
            case 'car':
                this.drawCarDetails(vehicle);
                break;
            case 'bus':
                this.drawBusDetails(vehicle);
                break;
            case 'auto':
                this.drawAutoDetails(vehicle);
                break;
        }
        
        this.ctx.restore();
    }

    drawCarDetails(vehicle) {
        this.ctx.fillStyle = '#2c3e50';
        // Windows
        this.ctx.fillRect(vehicle.x + vehicle.width * 0.2, vehicle.y + vehicle.height * 0.2, 
                         vehicle.width * 0.6, vehicle.height * 0.15);
        this.ctx.fillRect(vehicle.x + vehicle.width * 0.2, vehicle.y + vehicle.height * 0.4, 
                         vehicle.width * 0.6, vehicle.height * 0.15);
        // Wheels
        this.ctx.beginPath();
        this.ctx.arc(vehicle.x + vehicle.width * 0.2, vehicle.y + vehicle.height * 0.15, 
                     vehicle.width * 0.1, 0, Math.PI * 2);
        this.ctx.arc(vehicle.x + vehicle.width * 0.2, vehicle.y + vehicle.height * 0.85, 
                     vehicle.width * 0.1, 0, Math.PI * 2);
        this.ctx.arc(vehicle.x + vehicle.width * 0.8, vehicle.y + vehicle.height * 0.15, 
                     vehicle.width * 0.1, 0, Math.PI * 2);
        this.ctx.arc(vehicle.x + vehicle.width * 0.8, vehicle.y + vehicle.height * 0.85, 
                     vehicle.width * 0.1, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawBusDetails(vehicle) {
        this.ctx.fillStyle = '#2c3e50';
        // Windows
        for(let i = 0; i < 4; i++) {
            this.ctx.fillRect(vehicle.x + vehicle.width * 0.1, 
                            vehicle.y + vehicle.height * (0.1 + i * 0.15),
                            vehicle.width * 0.8, vehicle.height * 0.1);
        }
        // Wheels
        this.ctx.beginPath();
        this.ctx.arc(vehicle.x + vehicle.width * 0.2, vehicle.y + vehicle.height * 0.9, 
                     vehicle.width * 0.12, 0, Math.PI * 2);
        this.ctx.arc(vehicle.x + vehicle.width * 0.8, vehicle.y + vehicle.height * 0.9, 
                     vehicle.width * 0.12, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawAutoDetails(vehicle) {
        this.ctx.fillStyle = '#2c3e50';
        
        // Cabin roof (triangular shape)
        this.ctx.beginPath();
        this.ctx.moveTo(vehicle.x + vehicle.width * 0.2, vehicle.y + vehicle.height * 0.3);
        this.ctx.lineTo(vehicle.x + vehicle.width * 0.5, vehicle.y + vehicle.height * 0.1);
        this.ctx.lineTo(vehicle.x + vehicle.width * 0.8, vehicle.y + vehicle.height * 0.3);
        this.ctx.closePath();
        this.ctx.fill();

        // Front window
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.fillRect(
            vehicle.x + vehicle.width * 0.35,
            vehicle.y + vehicle.height * 0.3,
            vehicle.width * 0.3,
            vehicle.height * 0.2
        );

        // Handle bars
        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(vehicle.x + vehicle.width * 0.4, vehicle.y + vehicle.height * 0.35);
        this.ctx.lineTo(vehicle.x + vehicle.width * 0.6, vehicle.y + vehicle.height * 0.35);
        this.ctx.stroke();

        // Wheels (three wheels for auto)
        this.ctx.beginPath();
        // Front wheel
        this.ctx.arc(
            vehicle.x + vehicle.width * 0.5,
            vehicle.y + vehicle.height * 0.8,
            vehicle.width * 0.12,
            0,
            Math.PI * 2
        );
        // Back wheels
        this.ctx.arc(
            vehicle.x + vehicle.width * 0.2,
            vehicle.y + vehicle.height * 0.9,
            vehicle.width * 0.1,
            0,
            Math.PI * 2
        );
        this.ctx.arc(
            vehicle.x + vehicle.width * 0.8,
            vehicle.y + vehicle.height * 0.9,
            vehicle.width * 0.1,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
    }

    drawZombie(zombie) {
        this.ctx.save();

        // Draw shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(
            zombie.x + zombie.width / 2,
            zombie.y + zombie.height - 5,
            zombie.width / 2,
            8,
            0,
            0,
            Math.PI * 2
        );
        this.ctx.fill();

        // Only add walking animation if not hit
        const walkCycle = zombie.isHit ? 0 : Math.sin(Date.now() / 200) * 2;
        this.ctx.translate(zombie.x, zombie.y + walkCycle);

        // Draw differently if hit
        if (zombie.isHit) {
            // Draw lying down
            this.ctx.rotate(Math.PI / 2);
            this.ctx.translate(-zombie.height / 2, -zombie.width / 2);
        }

        // Body
        this.ctx.fillStyle = zombie.color;
        this.ctx.fillRect(0, zombie.height * 0.3, zombie.width, zombie.height * 0.4);

        // Head
        this.ctx.beginPath();
        this.ctx.arc(zombie.width / 2, zombie.height * 0.2, zombie.width / 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Glowing eyes
        this.ctx.fillStyle = zombie.glowColor;
        this.ctx.beginPath();
        this.ctx.arc(zombie.width * 0.35, zombie.height * 0.15, 2, 0, Math.PI * 2);
        this.ctx.arc(zombie.width * 0.65, zombie.height * 0.15, 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Only draw legs animation if not hit
        if (!zombie.isHit) {
            this.ctx.beginPath();
            this.ctx.moveTo(zombie.width * 0.3, zombie.height * 0.7);
            this.ctx.lineTo(zombie.width * 0.3, zombie.height * (0.7 + Math.sin(Date.now() / 200) * 0.1));
            this.ctx.moveTo(zombie.width * 0.7, zombie.height * 0.7);
            this.ctx.lineTo(zombie.width * 0.7, zombie.height * (0.7 - Math.sin(Date.now() / 200) * 0.1));
            this.ctx.strokeStyle = zombie.color;
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawPowerUp(powerUp) {
        this.ctx.save();
        
        // Draw glow effect
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = powerUp.color;
        
        // Draw power-up circle
        this.ctx.fillStyle = powerUp.color;
        this.ctx.beginPath();
        this.ctx.arc(
            powerUp.x + powerUp.width/2,
            powerUp.y + powerUp.height/2,
            powerUp.width/2,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        
        // Draw icon based on type
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const icon = powerUp.type === 'invincibility' ? '✨' : '⚡';
        this.ctx.fillText(
            icon,
            powerUp.x + powerUp.width/2,
            powerUp.y + powerUp.height/2
        );
        
        this.ctx.restore();
    }

    draw() {
        // Clear canvas and draw road
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawRoad();

        // Draw all game objects in sorted order
        if (this.gameObjects) {
            this.gameObjects.forEach(obj => {
                switch(obj.type) {
                    case 'vehicle':
                        this.drawVehicle(obj.object);
                        break;
                    case 'zombie':
                        this.drawZombie(obj.object);
                        break;
                    case 'powerup':
                        this.drawPowerUp(obj.object);
                        break;
                }
            });
        }

        // Draw bike with glow effect if invincible
        if (this.isInvincible) {
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = '#f1c40f';
        }
        this.drawBike(this.bike.x, this.bike.y, 1, this.bike.lean);
        this.ctx.shadowBlur = 0;

        // Draw boost meter
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(10, 10, 104, 20);
        this.ctx.fillStyle = this.bike.boost.cooldown > 0 ? '#95a5a6' : '#e74c3c';
        this.ctx.fillRect(12, 12, this.bike.boost.amount, 16);
        
        // Draw boost cooldown text if applicable
        if (this.bike.boost.cooldown > 0) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`Cooldown: ${Math.ceil(this.bike.boost.cooldown / 60)}s`, 12, 40);
        }

        // Debug info
        if (this.vehicles.length > 0) {
            console.log('Active vehicles:', this.vehicles.length);
        }

        // Add visual effects for boost
        if (this.bike.boost.isActive) {
            // Draw boost particles or effect here
            this.ctx.fillStyle = 'rgba(255, 165, 0, 0.5)';
            this.ctx.beginPath();
            this.ctx.moveTo(this.bike.x - 20, this.bike.y);
            this.ctx.lineTo(this.bike.x - 40, this.bike.y - 10);
            this.ctx.lineTo(this.bike.x - 40, this.bike.y + 10);
            this.ctx.fill();
        }
    }

    spawnVehicle() {
        const types = [
            { width: 60, height: 80, type: 'car', color: '#3498db' }, // Further increased car width
            { width: 70, height: 100, type: 'bus', color: '#2ecc71' }, // Further increased bus width
            { width: 65, height: 90, type: 'auto', color: '#f1c40f' }  // Further increased auto width
        ];
        
        const type = types[Math.floor(Math.random() * types.length)];
        const lane = this.lanes[Math.floor(Math.random() * this.lanes.length)];
        
        const vehicle = {
            x: lane - (type.width / 2),
            y: -type.height,
            width: type.width,
            height: type.height,
            type: type.type,
            color: type.color,
            speed: this.difficultySettings[this.difficulty].vehicleSpeed * 0.9 // Reduced speed by 10%
        };
        
        this.vehicles.push(vehicle);
    }

    spawnPowerUp() {
        const types = [
            { type: 'invincibility', color: '#f1c40f' },
            { type: 'slowMotion', color: '#3498db' }
        ];
        
        const type = types[Math.floor(Math.random() * types.length)];
        const powerUp = {
            x: Math.random() * (this.roadWidth - 30) + this.roadLeft, // Ensure power-ups spawn within the road
            y: -30,
            width: 30,
            height: 30,
            color: type.color,
            type: type.type,
            speed: 3
        };
        
        this.powerUps.push(powerUp);
    }

    spawnZombie() {
        const side = Math.random() > 0.5;
        const zombie = {
            x: side ? this.roadLeft : this.roadLeft + this.roadWidth, // Spawn from road edges
            y: Math.random() * (this.canvas.height - 100) + 50,
            width: 20,
            height: 40,
            color: '#000000', // Changed zombie color to black
            speed: (Math.random() * 1 + 0.5) * (side ? 1 : -1),
            isHit: false,  // Track if zombie is hit
            glowColor: '#ff0000' // Added glowing eyes effect
        };
        this.zombies.push(zombie);
    }

    updateZombies() {
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];

            // Skip movement if hit by vehicle
            if (!zombie.isHit) {
                zombie.x += zombie.speed;
                // Add zigzagging behavior
                if (Math.random() < 0.05) {
                    zombie.y += Math.random() > 0.5 ? 5 : -5;
                }
            }

            // Check for collisions with vehicles
            for (const vehicle of this.vehicles) {
                if (!zombie.isHit && this.checkCollision(zombie, vehicle)) {
                    zombie.isHit = true;
                    zombie.color = '#7f8c8d'; // Change color when hit
                    zombie.speed = vehicle.speed; // Match vehicle speed
                    zombie.y += vehicle.speed; // Move with vehicle
                    this.score += 5; // Bonus points for vehicle hitting zombie
                }
            }

            // Remove zombie if off screen
            if (
                zombie.x < -50 ||
                zombie.x > this.canvas.width + 50 ||
                zombie.y > this.canvas.height
            ) {
                this.zombies.splice(i, 1);
                continue;
            }

            // Check for collision with bike
            if (!zombie.isHit && this.checkCollision(this.bike, zombie)) {
                this.handleCollision();
            }
        }
    }

    updateVehicles() {
        for(let i = this.vehicles.length - 1; i >= 0; i--) {
            const vehicle = this.vehicles[i];
            vehicle.y += vehicle.speed;
            
            // Remove vehicles that are off screen
            if (vehicle.y > this.canvas.height) {
                this.vehicles.splice(i, 1);
                this.score += 10;
                continue;
            }
            
            // Check for collision with bike
            if (this.checkCollision(this.bike, vehicle)) {
                this.handleCollision();
            }
        }
    }

    updatePowerUps() {
        this.powerUps.forEach((powerUp, index) => {
            powerUp.y += powerUp.speed;
            if (powerUp.y > this.canvas.height) {
                this.powerUps.splice(index, 1);
            }
            if (this.checkCollision(this.bike, powerUp)) {
                this.powerUp = powerUp;
                this.powerUps.splice(index, 1);
            }
        });
    }

    updateGame(deltaTime) {
        if (!this.gameStarted || this.gameOver) return;

        // Update score multiplier
        if (this.multiplierTimer > 0) {
            this.multiplierTimer--;
            if (this.multiplierTimer <= 0) {
                this.scoreMultiplier = 1;
            }
        }

        // Update difficulty settings based on level - FIXED speed scaling
        Object.keys(this.difficultySettings).forEach(diff => {
            this.difficultySettings[diff].vehicleSpeed = (2 + this.level * 0.5) * (diff === 'easy' ? 1 : diff === 'medium' ? 1.3 : 1.6);
            this.difficultySettings[diff].spawnRate = Math.min(0.05, 0.01 + (this.level * 0.003));
        });

        // Update road animation
        this.roadOffset = (this.roadOffset + this.roadSpeed) % 40;

        // Physics-based movement
        if (this.keys.left) {
            this.bike.velocity.x -= this.bike.acceleration;
        }
        if (this.keys.right) {
            this.bike.velocity.x += this.bike.acceleration;
        }
        if (this.keys.up) {
            this.bike.velocity.y -= this.bike.acceleration;
        }
        if (this.keys.down) {
            this.bike.velocity.y += this.bike.acceleration;
        }

        // Apply boost if active
        if (this.bike.boost.isActive && this.bike.boost.amount > 0) {
            this.bike.velocity.x *= 1.5;
            this.bike.velocity.y *= 1.5;
            this.bike.boost.amount -= this.bike.boost.drainRate;
            if (this.bike.boost.amount <= 0) {
                this.bike.boost.isActive = false;
                this.bike.boost.cooldown = this.bike.boost.maxCooldown;
            }
        }

        // Apply friction
        this.bike.velocity.x *= this.bike.friction;
        this.bike.velocity.y *= this.bike.friction;

        // Update boost cooldown and recharge
        if (!this.bike.boost.isActive) {
            if (this.bike.boost.cooldown > 0) {
                this.bike.boost.cooldown--;
            } else if (this.bike.boost.amount < 100) {
                this.bike.boost.amount += this.bike.boost.rechargeRate;
            }
        }

        // Apply velocity with bounds checking
        this.bike.x = Math.max(this.roadLeft, 
                              Math.min(this.roadLeft + this.roadWidth - this.bike.width,
                              this.bike.x + this.bike.velocity.x));
        this.bike.y = Math.max(0,
                              Math.min(this.canvas.height - this.bike.height,
                              this.bike.y + this.bike.velocity.y));

        // Calculate lean based on horizontal velocity
        const targetLean = (this.bike.velocity.x / this.bike.maxSpeed) * this.bike.maxLean;
        this.bike.lean += (targetLean - this.bike.lean) * 0.2;

        // Add bike trail
        this.bike.trail.unshift({ x: this.bike.x, y: this.bike.y, lean: this.bike.lean });
        if (this.bike.trail.length > 5) this.bike.trail.pop();

        // Spawn objects based on difficulty and level
        if (Math.random() < this.difficultySettings[this.difficulty].spawnRate * Math.min(this.level, 5)) {
            this.spawnVehicle();
        }
        
        if (Math.random() < 0.01) {
            this.spawnZombie();
        }
        
        if (Math.random() < this.difficultySettings[this.difficulty].powerUpRate) {
            this.spawnPowerUp();
        }

        // Update all game objects
        this.updateVehicles();
        this.updateZombies();
        this.updatePowerUps();

        // Update game progress
        this.distance += this.speed / 10;
        this.checkLevelUp();

        // Ensure HUD is updated every frame
        this.updateHUD();

        // Sort objects by y position for proper layering
        this.gameObjects = [
            ...this.vehicles.map(v => ({ type: 'vehicle', object: v })),
            ...this.zombies.map(z => ({ type: 'zombie', object: z })),
            ...this.powerUps.map(p => ({ type: 'powerup', object: p }))
        ].sort((a, b) => 
            (a.object.y + a.object.height) - (b.object.y + b.object.height)
        );
    }

    checkLevelUp() {
        if (this.score >= this.level * 100) {
            this.level++;
            const levelUpScreen = document.getElementById('levelUpScreen');
            levelUpScreen.querySelector('.level-number').textContent = `Level ${this.level}`;
            levelUpScreen.classList.remove('hidden');
            levelUpScreen.classList.add('show');
            setTimeout(() => {
                levelUpScreen.classList.remove('show');
                levelUpScreen.classList.add('hidden');
            }, 2000);
        }
    }

    handleCollision() {
        if (!this.isInvincible) {
            this.scoreMultiplier = 1;
            this.multiplierTimer = 0;
            document.getElementById('game-container').classList.add('collision');
            setTimeout(() => {
                document.getElementById('game-container').classList.remove('collision');
            }, 500);

            this.gameOver = true;
            document.getElementById('gameOverScreen').classList.remove('hidden');
            document.getElementById('finalScore').textContent = `Score: ${this.score}`;
            document.getElementById('finalDistance').textContent = `Distance: ${Math.floor(this.distance)}m`;
            document.getElementById('finalLevel').textContent = `Level: ${this.level}`;
        }
    }

    updateScore(points) {
        this.score += points * this.scoreMultiplier;
        // Increase multiplier and reset timer
        this.scoreMultiplier = Math.min(4, this.scoreMultiplier + 0.5);
        this.multiplierTimer = this.multiplierDuration;
    }

    updateHUD() {
        // Update HUD elements if they exist
        const scoreElement = document.getElementById('scoreValue');
        if (scoreElement) {
            scoreElement.textContent = this.score;
        }

        const levelElement = document.getElementById('levelValue');
        if (levelElement) {
            levelElement.textContent = this.level;
        }

        const distanceElement = document.getElementById('distanceValue');
        if (distanceElement) {
            distanceElement.textContent = Math.floor(this.distance);
        }

        const multiplierElement = document.getElementById('multiplierValue');
        if (multiplierElement) {
            multiplierElement.textContent = `x${this.scoreMultiplier.toFixed(1)}`;
            multiplierElement.className = this.scoreMultiplier > 1 ? 'active' : '';
        }
    }

    drawRoad() {
        // Background (grass)
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Road surface
        this.ctx.fillStyle = '#34495e';
        this.ctx.fillRect(this.roadLeft, 0, this.roadWidth, this.canvas.height);

        // Road edges (yellow lines)
        this.ctx.strokeStyle = '#f1c40f';
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(this.roadLeft, 0);
        this.ctx.lineTo(this.roadLeft, this.canvas.height);
        this.ctx.moveTo(this.roadLeft + this.roadWidth, 0);
        this.ctx.lineTo(this.roadLeft + this.roadWidth, this.canvas.height);
        this.ctx.stroke();

        // Animated lane markers
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([20, 20]);
        
        // Draw animated lanes
        this.lanes.forEach(x => {
            let y = -this.roadOffset;
            this.ctx.beginPath();
            while (y < this.canvas.height) {
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x, y + 20);
                y += 40;
            }
            this.ctx.stroke();
        });
        this.ctx.setLineDash([]);

        // Add road texture/shading
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for (let i = 0; i < this.canvas.height; i += 40) {
            const y = (i - this.roadOffset) % this.canvas.height;
            this.ctx.fillRect(this.roadLeft, y, this.roadWidth, 20);
        }
    }

    gameLoop(currentTime) {
        if (!this.lastTime) {
            this.lastTime = currentTime;
        }
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        if (!this.gameOver && this.gameStarted) {
            // Update game state
            this.updateGame(deltaTime);
            
            // Draw everything
            this.draw();
            
            // Continue the game loop
            requestAnimationFrame(this.gameLoop);
        }
    }

    setupEventListeners() {
        // Key events for bike control
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = true;
            if (e.key === 'ArrowUp' || e.key === 'w') this.keys.up = true;
            if (e.key === 'ArrowDown' || e.key === 's') this.keys.down = true;
            if (e.key === ' ') this.activatePowerUp();
            if (e.key === 'Shift' && !this.bike.boost.isActive && this.bike.boost.amount > 0 && this.bike.boost.cooldown === 0) {
                this.bike.boost.isActive = true;
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = false;
            if (e.key === 'ArrowUp' || e.key === 'w') this.keys.up = false;
            if (e.key === 'ArrowDown' || e.key === 's') this.keys.down = false;
            if (e.key === 'Shift') {
                this.bike.boost.isActive = false;
            }
        });
        
        // Difficulty selection
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.difficulty = btn.dataset.difficulty;
            });
        });
        
        // Start and restart buttons
        document.getElementById('startButton').addEventListener('click', () => this.startGame());
        document.getElementById('restartButton').addEventListener('click', () => this.startGame());
    }

    activatePowerUp() {
        if (this.powerUp) {
            switch (this.powerUp.type) {
                case 'invincibility':
                    this.isInvincible = true;
                    setTimeout(() => {
                        this.isInvincible = false;
                    }, 3000); // 3 seconds of invincibility
                    break;
                case 'slowMotion':
                    // ...existing code for slow motion...
                    break;
            }
            this.powerUp = null; // Clear the power-up after activation
        }
    }

    showMenu() {
        document.getElementById('menuScreen').classList.remove('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
    }

    startGame() {
        this.gameStarted = true;
        this.gameOver = false;
        this.score = 0;
        this.distance = 0;
        this.level = 1;
        this.vehicles = [];
        this.zombies = [];
        this.powerUps = [];

        // Remove initial 0 score from the DOM
        const scoreElement = document.getElementById('scoreValue');
        if (scoreElement) {
            scoreElement.textContent = '';
        }

        document.getElementById('menuScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');

        // Reset game loop timing
        this.lastTime = 0;
        requestAnimationFrame(this.gameLoop);
    }

    checkCollision(object1, object2) {
        return (
            object1.x < object2.x + object2.width &&
            object1.x + object1.width > object2.x &&
            object1.y < object2.y + object2.height &&
            object1.y + object1.height > object2.y
        );
    }
}

class Bike {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 80;
        this.color = '#e74c3c';
        this.lean = 0;
        this.maxLean = 30;
        
        // Physics properties
        this.velocity = { x: 0, y: 0 };
        this.acceleration = 0.5;
        this.friction = 0.95;
        this.maxSpeed = 10;
        
        // Boost mechanics
        this.boost = {
            isActive: false,
            amount: 100,
            cooldown: 0,
            maxCooldown: 180,
            drainRate: 2,
            rechargeRate: 0.5
        };
        
        // Trail effect
        this.trail = [];
    }
}

// Initialize game
window.onload = function() {
    // Add menu and game over screens to the DOM
    const menuScreen = document.createElement('div');
    menuScreen.id = 'menuScreen';
    menuScreen.innerHTML = `
        <h1>Dead Lane</h1>
        <div class="difficulty-selection">
            <button class="difficulty-btn selected" data-difficulty="easy">Easy</button>
            <button class="difficulty-btn" data-difficulty="medium">Medium</button>
            <button class="difficulty-btn" data-difficulty="hard">Hard</button>
        </div>
        <button id="startButton">Start Game</button>
    `;
    document.getElementById('game-container').appendChild(menuScreen);

    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'gameOverScreen';
    gameOverScreen.classList.add('hidden');
    gameOverScreen.innerHTML = `
        <h2>Game Over</h2>
        <p id="finalScore">Score: 0</p>
        <p id="finalDistance">Distance: 0m</p>
        <p id="finalLevel">Level: 1</p>
        <button id="restartButton">Play Again</button>
    `;
    document.getElementById('game-container').appendChild(gameOverScreen);

    // Ensure only one HUD is created
    if (!document.getElementById('hud')) {
        const hud = document.createElement('div');
        hud.id = 'hud';
        hud.innerHTML = `
            <div id="score">Score: <span id="scoreValue"></span></div>
            <div id="level">Level: <span id="levelValue">1</span></div>
            <div id="distance">Distance: <span id="distanceValue"></span>m</div>
            <div id="multiplier">Multiplier: <span id="multiplierValue"></span></div>
        `;
        document.getElementById('game-container').appendChild(hud);
    }

    const levelUpScreen = document.createElement('div');
    levelUpScreen.id = 'levelUpScreen';
    levelUpScreen.classList.add('hidden');
    levelUpScreen.innerHTML = `
        <div class="level-up-content">
            <h2>Level Up!</h2>
            <p class="level-number">Level 1</p>
        </div>
    `;
    document.getElementById('game-container').appendChild(levelUpScreen);

    const game = new Game();
    game.setupEventListeners();
    game.showMenu();
}