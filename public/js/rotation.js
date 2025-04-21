// Initialize Three.js scene
const scene = new THREE.Scene();
const baseViewSize = 10;
let viewSize = baseViewSize;

// Fixed dimensions
const WIDTH = 500;
const HEIGHT = 500;

// Initialize renderer with fixed dimensions
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('rotationCanvas'),
    antialias: true
});
renderer.setSize(WIDTH, HEIGHT);
renderer.setClearColor(0x000000, 1);

// Initialize camera with fixed aspect ratio
const camera = new THREE.OrthographicCamera(
    -viewSize / 2,    // left
    viewSize / 2,     // right
    viewSize / 2,     // top
    -viewSize / 2,    // bottom
    0.1,             // near
    100              // far
);

// Set up renderer and camera
function updateCameraView() {
    // Only update the view size for zoom, dimensions stay fixed
    camera.left = -viewSize / 2;
    camera.right = viewSize / 2;
    camera.top = viewSize / 2;
    camera.bottom = -viewSize / 2;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
}

function resizeCanvas() {
    // No need to resize since we have fixed dimensions
    updateCameraView();
}

// Remove resize listener since we have fixed dimensions
// window.removeEventListener('resize', resizeCanvas);

// Set up camera position
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

// Create transformed grid
const gridSize = 10;
const gridDivisions = 10;
const gridStep = gridSize / gridDivisions;
const transformedGridGeometry = new THREE.BufferGeometry();
const gridVertices = [];
const gridColors = [];

// Create horizontal and vertical grid lines
for (let i = -gridSize/2; i <= gridSize/2; i += gridStep) {
    // Horizontal lines
    gridVertices.push(-gridSize/2, i, 0);
    gridVertices.push(gridSize/2, i, 0);
    // Vertical lines
    gridVertices.push(i, -gridSize/2, 0);
    gridVertices.push(i, gridSize/2, 0);
    
    // Add colors (blue for transformed grid)
    const color = new THREE.Color(0x0088ff);
    for (let j = 0; j < 4; j++) {
        gridColors.push(color.r, color.g, color.b);
    }
}

transformedGridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridVertices, 3));
transformedGridGeometry.setAttribute('color', new THREE.Float32BufferAttribute(gridColors, 3));
const transformedGridMaterial = new THREE.LineBasicMaterial({ 
    vertexColors: true,
    opacity: 0.4,
    transparent: true 
});
const transformedGrid = new THREE.LineSegments(transformedGridGeometry, transformedGridMaterial);
scene.add(transformedGrid);

// Create materials
const randomPointMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 }); // Yellow line for axis

// Create X and Y axes
const axesGeometry = new THREE.BufferGeometry();
const axesVertices = new Float32Array([
    -5, 0, 0,    // X axis start
    5, 0, 0,     // X axis end
    0, -5, 0,    // Y axis start
    0, 5, 0      // Y axis end
]);
axesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(axesVertices, 3));

// Create separate materials for X and Y axes
const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red for X
const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 }); // Green for Y

// Create separate lines for each axis
const xAxisGeometry = new THREE.BufferGeometry();
xAxisGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-5, 0, 0, 5, 0, 0], 3));
const yAxisGeometry = new THREE.BufferGeometry();
yAxisGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, -5, 0, 0, 5, 0], 3));

const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);

// Store original vertices for axes
xAxisGeometry.userData.originalVertices = new Float32Array([-5, 0, 0, 5, 0, 0]);
yAxisGeometry.userData.originalVertices = new Float32Array([0, -5, 0, 0, 5, 0]);

scene.add(xAxis);
scene.add(yAxis);

// Create rotation axis line (uses lineMaterial defined earlier)
const axisLineGeometry = new THREE.BufferGeometry();
const axisLineVertices = new Float32Array([
    0, -5, 0,   // Start point
    0, 5, 0     // End point
]);
axisLineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(axisLineVertices, 3));
const axisLine = new THREE.Line(axisLineGeometry, lineMaterial);
scene.add(axisLine);

// Store random points and text objects
const randomPoints = [];
const textObjects = [];

// Create text plane function
function createTextSprite(text, x, y) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontSize = 64;
    context.font = `bold ${fontSize}px Arial`;
    
    // Measure text
    const textMetrics = context.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    // Set canvas size with padding
    const padding = fontSize * 0.2;
    canvas.width = textWidth + (padding * 2);
    canvas.height = textHeight + (padding * 2);

    // Clear background to transparent
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw text with bold font
    context.font = `bold ${fontSize}px Arial`;
    context.fillStyle = 'white';
    context.textBaseline = 'middle'; // Center text vertically
    context.textAlign = 'left';
    context.fillText(text, padding, canvas.height / 2);

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    // Create plane geometry
    const aspectRatio = canvas.width / canvas.height;
    const height = 0.5;
    const width = height * aspectRatio;
    const geometry = new THREE.PlaneGeometry(width, height);

    // Create material
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });

    // Create mesh
    const textMesh = new THREE.Mesh(geometry, material);
    textMesh.position.set(x, y, 0);
    
    return textMesh;
}

// Function to add text, projected onto the rotated plane
function addText() {
    const textInput = document.getElementById('textInput');
    const text = textInput.value.trim();
    
    if (text) {
        // Get current rotation state
        const rotationAngle = parseFloat(document.getElementById('rotationAngle').value) * Math.PI / 180;
        const lineAngleRad = parseFloat(document.getElementById('lineAngle').value) * Math.PI / 180;
        
        // Create rotation axis vector
        const axis = new THREE.Vector3(
            Math.cos(lineAngleRad),
            Math.sin(lineAngleRad),
            0
        ).normalize();

        // Create text mesh at the origin (0,0,0) initially
        const textMesh = createTextSprite(text, 0, 0); 
        
        // Define and store the original (unrotated) position
        const originalPosition = new THREE.Vector3(0, 0, 0);
        textMesh.userData.originalPosition = originalPosition.clone(); // Store the original

        // Calculate the position on the currently rotated plane
        const rotatedPosition = applyRodriguesRotation(originalPosition, axis, rotationAngle);
        textMesh.position.copy(rotatedPosition); // Set initial position

        // Store the original (unrotated) rotation
        textMesh.userData.originalRotation = new THREE.Euler(0, 0, 0); // Store original orientation

        // Calculate and apply the initial orientation based on current rotation
        const initialRotationMatrix = new THREE.Matrix4();
        initialRotationMatrix.makeRotationAxis(axis, rotationAngle);
        textMesh.setRotationFromMatrix(initialRotationMatrix); // Set initial orientation
        
        scene.add(textMesh);
        textObjects.push(textMesh);
        
        // Clear input
        textInput.value = '';
    }
}

// Function to clear all text
function clearAllText() {
    textObjects.forEach(text => {
        scene.remove(text);
    });
    textObjects.length = 0;
}

// Add text controls event listeners
document.getElementById('addText').addEventListener('click', addText);
document.getElementById('clearText').addEventListener('click', clearAllText);
document.getElementById('textInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addText();
    }
});

// Function to create a random point
function createRandomPoint() {
    // Get current rotation state
    const rotationAngle = parseFloat(document.getElementById('rotationAngle').value) * Math.PI / 180;
    const lineAngleRad = parseFloat(document.getElementById('lineAngle').value) * Math.PI / 180;
    
    // Create rotation axis vector
    const axis = new THREE.Vector3(
        Math.cos(lineAngleRad),
        Math.sin(lineAngleRad),
        0
    ).normalize();
    
    // Create a point in the original XY plane
    const pointGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const x = (Math.random() - 0.5) * 10; // Random x between -5 and 5
    const y = (Math.random() - 0.5) * 10; // Random y between -5 and 5
    
    // Create the original position vector
    const originalPosition = new THREE.Vector3(x, y, 0);
    
    // Apply the current rotation to get the point's position in the rotated plane
    const rotatedPosition = applyRodriguesRotation(originalPosition, axis, rotationAngle);
    
    const randomPoint = new THREE.Mesh(pointGeometry, randomPointMaterial);
    randomPoint.position.copy(rotatedPosition);
    
    // Store the original position for future rotations
    randomPoint.userData.originalPosition = originalPosition;
    
    scene.add(randomPoint);
    randomPoints.push(randomPoint);
    updatePointCount();
}

// Function to remove the last added point
function removeLastPoint() {
    if (randomPoints.length > 0) {
        const point = randomPoints.pop();
        scene.remove(point);
        updatePointCount();
    }
}

// Function to update point count display
function updatePointCount() {
    const pointCount = document.getElementById('pointCount');
    pointCount.textContent = `${randomPoints.length} points`;
}

// Add button event listeners
document.getElementById('addPoint').addEventListener('click', createRandomPoint);
document.getElementById('removePoint').addEventListener('click', removeLastPoint);

// Get UI elements
const pointX = document.getElementById('pointX');
const pointY = document.getElementById('pointY');
const lineAngle = document.getElementById('lineAngle');
const rotationAngle = document.getElementById('rotationAngle');
const zoomFactor = document.getElementById('zoomFactor');
const pointXValue = document.getElementById('pointXValue');
const pointYValue = document.getElementById('pointYValue');
const lineAngleValue = document.getElementById('lineAngleValue');
const rotationAngleValue = document.getElementById('rotationAngleValue');
const zoomValue = document.getElementById('zoomValue');

// Function to apply Rodrigues rotation to a point
function applyRodriguesRotation(point, axis, angle) {
    const cosTheta = Math.cos(angle);
    const sinTheta = Math.sin(angle);
    
    const crossProduct = new THREE.Vector3().crossVectors(axis, point);
    const dotProduct = axis.dot(point);
    
    return point.clone()
        .multiplyScalar(cosTheta)
        .add(crossProduct.multiplyScalar(sinTheta))
        .add(axis.clone().multiplyScalar(dotProduct * (1 - cosTheta)));
}

// Helper function to convert degrees to radians
function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

// Function to update zoom
function updateZoom() {
    const zoomFactor = parseFloat(document.getElementById('zoomFactor').value);
    viewSize = baseViewSize / zoomFactor;
    updateCameraView();
    document.getElementById('zoomValue').textContent = `${zoomFactor.toFixed(1)}×`;
}

// Update values function
function updateValues() {
    // Get rotation angles
    const rotationAngleDeg = parseFloat(document.getElementById('rotationAngle').value);
    const lineAngleDeg = parseFloat(document.getElementById('lineAngle').value);
    const rotationAngle = rotationAngleDeg * Math.PI / 180;
    const lineAngleRad = lineAngleDeg * Math.PI / 180;
    
    // Create direction vector from line angle
    const axis = new THREE.Vector3(
        Math.cos(lineAngleRad),
        Math.sin(lineAngleRad),
        0
    ).normalize();

    // Update rotation axis line
    const lineLength = 5;  // Half-length of the line
    const axisPositions = axisLine.geometry.attributes.position.array;
    axisPositions[0] = -axis.x * lineLength;  // Start x
    axisPositions[1] = -axis.y * lineLength;  // Start y
    axisPositions[2] = 0;                     // Start z
    axisPositions[3] = axis.x * lineLength;   // End x
    axisPositions[4] = axis.y * lineLength;   // End y
    axisPositions[5] = 0;                     // End z
    axisLine.geometry.attributes.position.needsUpdate = true;

    // Rotate X axis
    const xPositions = xAxis.geometry.attributes.position.array;
    const xOriginal = new Float32Array([-5, 0, 0, 5, 0, 0]);
    for (let i = 0; i < xPositions.length; i += 3) {
        const point = new THREE.Vector3(xOriginal[i], xOriginal[i + 1], xOriginal[i + 2]);
        const rotatedPoint = applyRodriguesRotation(point, axis, rotationAngle);
        xPositions[i] = rotatedPoint.x;
        xPositions[i + 1] = rotatedPoint.y;
        xPositions[i + 2] = rotatedPoint.z;
    }
    xAxis.geometry.attributes.position.needsUpdate = true;

    // Rotate Y axis
    const yPositions = yAxis.geometry.attributes.position.array;
    const yOriginal = new Float32Array([0, -5, 0, 0, 5, 0]);
    for (let i = 0; i < yPositions.length; i += 3) {
        const point = new THREE.Vector3(yOriginal[i], yOriginal[i + 1], yOriginal[i + 2]);
        const rotatedPoint = applyRodriguesRotation(point, axis, rotationAngle);
        yPositions[i] = rotatedPoint.x;
        yPositions[i + 1] = rotatedPoint.y;
        yPositions[i + 2] = rotatedPoint.z;
    }
    yAxis.geometry.attributes.position.needsUpdate = true;

    // Store original grid vertices if not already stored
    if (!transformedGridGeometry.userData.originalVertices) {
        const positions = transformedGridGeometry.attributes.position.array;
        transformedGridGeometry.userData.originalVertices = new Float32Array(positions.length);
        for (let i = 0; i < positions.length; i++) {
            transformedGridGeometry.userData.originalVertices[i] = positions[i];
        }
    }

    // Update random points
    randomPoints.forEach(point => {
        const originalPos = point.userData.originalPosition.clone();
        const rotatedPos = applyRodriguesRotation(originalPos, axis, rotationAngle);
        point.position.copy(rotatedPos);
    });

    // Update text objects with both position and orientation
    textObjects.forEach(textObj => {
        if (textObj.userData.originalPosition) {
            // Rotate position
            const originalPos = textObj.userData.originalPosition.clone();
            const rotatedPos = applyRodriguesRotation(originalPos, axis, rotationAngle);
            textObj.position.copy(rotatedPos);

            // Calculate rotation matrix for orientation
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationAxis(axis, rotationAngle);
            
            // Apply rotation
            textObj.setRotationFromMatrix(rotationMatrix);
        }
    });

    // Transform grid using original vertices
    const positions = transformedGridGeometry.attributes.position.array;
    const originalVertices = transformedGridGeometry.userData.originalVertices;
    
    for (let i = 0; i < positions.length; i += 3) {
        const originalPoint = new THREE.Vector3(
            originalVertices[i],
            originalVertices[i + 1],
            originalVertices[i + 2]
        );
        const rotatedPoint = applyRodriguesRotation(originalPoint, axis, rotationAngle);
        positions[i] = rotatedPoint.x;
        positions[i + 1] = rotatedPoint.y;
        positions[i + 2] = rotatedPoint.z;
    }
    transformedGridGeometry.attributes.position.needsUpdate = true;

    // Update display values
    document.getElementById('lineAngleValue').textContent = `${document.getElementById('lineAngle').value}°`;
    document.getElementById('rotationAngleValue').textContent = `${document.getElementById('rotationAngle').value}°`;

    // Calculate and display the 2x2 affine transformation matrix
    const cosTheta = Math.cos(rotationAngle);
    const oneMinusCosTheta = 1.0 - cosTheta;
    const kx = axis.x;
    const ky = axis.y;

    const a = cosTheta + kx * kx * oneMinusCosTheta;
    const b = kx * ky * oneMinusCosTheta; // Element (2,1)
    const c = kx * ky * oneMinusCosTheta; // Element (1,2)
    const d = cosTheta + ky * ky * oneMinusCosTheta;

    document.getElementById('matrix-a').textContent = a.toFixed(2);
    document.getElementById('matrix-b').textContent = b.toFixed(2);
    document.getElementById('matrix-c').textContent = c.toFixed(2);
    document.getElementById('matrix-d').textContent = d.toFixed(2);

    // Update angle display values
    document.getElementById('angle-phi').textContent = lineAngleDeg.toFixed(0);
    document.getElementById('angle-theta').textContent = rotationAngleDeg.toFixed(0);

    renderer.render(scene, camera);
}

// Function to create text for a point
function createTextForPoint(point, index) {
    const loader = new THREE.FontLoader();
    loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
        const textGeometry = new THREE.TextGeometry(`P${index}`, {
            font: font,
            size: 0.3,
            height: 0.1
        });
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        
        // Position text slightly offset from the point
        textMesh.position.copy(point.position);
        textMesh.position.x += 0.3;
        textMesh.position.y += 0.3;
        
        // Store the original position for rotation
        textMesh.userData.originalPosition = textMesh.position.clone();
        
        scene.add(textMesh);
        textObjects.push(textMesh);
    });
}

// Wait for DOM to be ready before setting up event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners
    document.getElementById('zoomFactor').addEventListener('input', updateZoom);
    document.getElementById('lineAngle').addEventListener('input', updateValues);
    document.getElementById('rotationAngle').addEventListener('input', updateValues);
    document.getElementById('resetView').addEventListener('click', resetView);
    document.getElementById('addPoint').addEventListener('click', createRandomPoint);
    document.getElementById('removePoint').addEventListener('click', removeLastPoint);
    document.getElementById('addText').addEventListener('click', addText);
    document.getElementById('clearText').addEventListener('click', clearAllText);
    document.getElementById('textInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addText();
        }
    });

    // Initial update and start animation
    updateValues();
    animate();
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Function to reset view and controls
function resetView() {
    // Reset control values
    document.getElementById('lineAngle').value = "45";
    document.getElementById('rotationAngle').value = "0";
    document.getElementById('zoomFactor').value = "1.0";
    
    // Reset view size
    viewSize = baseViewSize;
    updateCameraView();
    
    // Update display values
    updateValues();
    updateZoom();
} 