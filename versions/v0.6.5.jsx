// ===== AutoResizePlaceAndTextMultiParagraph_AdjustFontSize.jsx =====
// This script does the following:
// 1. Sets the background color to black.
// 2. Resizes the canvas to 3× the original width (anchored at TOPLEFT).
// 3. Moves the image layer to (0,0) and fills the extra area with black.
// 4. Prompts you to paste your multi‐paragraph ChatGPT output
//    (converting newlines to carriage returns).
// 5. Creates a paragraph text layer in the visible (black) area using target margins.
// 6. Iteratively adjusts the font size so that the rendered text height exactly equals
//    the target text height (i.e. the bottom of the text is exactly 0.025×H from the canvas bottom)
//    and ensures the text does not overflow horizontally.
(function() {
    // ----- Step 1. Set Photoshop's background color to black.
    var blackColor = new SolidColor();
    blackColor.rgb.red = 0;
    blackColor.rgb.green = 0;
    blackColor.rgb.blue = 0;
    app.backgroundColor = blackColor;
    
    // ----- Step 2. Get the active document and its dimensions.
    var doc = app.activeDocument;
    var W = doc.width.as("px");   // original width
    var H = doc.height.as("px");  // original height
    
    // ----- Step 3. Resize the canvas: new width = 3×W, height remains H.
    doc.resizeCanvas(UnitValue(W * 3, "px"), UnitValue(H, "px"), AnchorPosition.TOPLEFT);
    
    // ----- Step 4. Process the image layer.
    // If the active layer is locked (background), duplicate it so it can be moved.
    var imageLayer;
    if (doc.activeLayer.isBackgroundLayer) {
        imageLayer = doc.activeLayer.duplicate();
        doc.activeLayer.remove();
    } else {
        imageLayer = doc.activeLayer;
    }
    // Move image layer so its top-left becomes (0,0).
    var imgBounds = imageLayer.bounds; // [left, top, right, bottom]
    var deltaX = -imgBounds[0].as("px");
    var deltaY = -imgBounds[1].as("px");
    imageLayer.translate(deltaX, deltaY);
    
    // ----- Step 5. Fill the extended canvas area with black.
    var bgLayer = doc.artLayers.add();
    bgLayer.name = "Background";
    doc.selection.selectAll();
    doc.selection.fill(blackColor);
    doc.selection.deselect();
    bgLayer.move(doc, ElementPlacement.PLACEATEND);
    
    // ----- Step 6. Get ChatGPT conversation output via a ScriptUI dialog.
    function getChatGPTOutput() {
        var dlg = new Window("dialog", "Enter ChatGPT Conversation Output");
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.add("statictext", undefined, "Paste your ChatGPT conversation output below:");
        var inputField = dlg.add("edittext", undefined, "", { multiline: true });
        inputField.preferredSize = [400, 300];
        var buttonGroup = dlg.add("group");
        buttonGroup.alignment = "right";
        var okButton = buttonGroup.add("button", undefined, "OK");
        okButton.onClick = function() { dlg.close(); };
        dlg.show();
        return inputField.text;
    }
    var chatGPTOutput = getChatGPTOutput();
    if (chatGPTOutput === "") {
        chatGPTOutput = "No output provided.";
    } else {
        // Convert newlines to carriage returns.
        chatGPTOutput = chatGPTOutput.replace(/\n/g, "\r");
    }
    
    // ----- Step 7. Define the target rectangle within the visible (black) area.
    // The visible (black) area is the right 2×W (from x = W to x = 3W).
    // Define margins as follows:
    //   • Vertical margins: 0.025×H at the top and bottom.
    //   • Horizontal margins: 0.025×(visible area width) = 0.025×(2×W) = 0.05×W.
    var marginVert = 0.025 * H;
    var marginHoriz = 0.05 * W;
    var targetTop = marginVert;            // = 0.025×H.
    var targetBottom = H - marginVert;       // = 0.975×H.
    var targetHeight = targetBottom - targetTop; // = 0.95×H.
    var targetLeft = W + marginHoriz;        // = W + 0.05×W = 1.05×W.
    var targetRight = (3 * W) - marginHoriz; // = 3W - 0.05×W = 2.95×W.
    var targetWidth = targetRight - targetLeft; // = 2.95W - 1.05W = 1.9×W.
    
    // ----- Step 8. Create a paragraph text layer using a fixed text box.
    // (Using paragraph text ensures automatic line wrapping.)
    var textLayer = doc.artLayers.add();
    textLayer.kind = LayerKind.TEXT;
    textLayer.name = "ChatGPT Conversation";
    textLayer.textItem.kind = TextType.PARAGRAPHTEXT;
    textLayer.textItem.contents = chatGPTOutput;
    // Set the text box's position and dimensions to match the target rectangle.
    textLayer.textItem.position = [new UnitValue(targetLeft, "px"), new UnitValue(targetTop, "px")];
    textLayer.textItem.width = new UnitValue(targetWidth, "px");
    textLayer.textItem.height = new UnitValue(targetHeight, "px");
    
    // Set initial formatting.
    textLayer.textItem.font = "ArialMT";          // Change if desired.
    textLayer.textItem.size = new UnitValue(24, "px"); // Starting font size.
    // Disable auto-leading and set leading equal to font size.
    textLayer.textItem.autoLeading = false;
    textLayer.textItem.leading = new UnitValue(24, "px");
    var textColor = new SolidColor();
    textColor.rgb.red = 255;
    textColor.rgb.green = 255;
    textColor.rgb.blue = 255;
    textLayer.textItem.color = textColor;
    
    // ----- Step 9. Adjust the text's font size so that its rendered height equals targetHeight.
    // We'll iteratively adjust the font size (and set leading equal to it) until the bounds' height
    // (which measures the actual drawn text) is within a small tolerance of targetHeight.
    function adjustFontSizeToFillVertical(layer, targetHeight, tolerance, maxIterations) {
        tolerance = tolerance || 0.5;      // acceptable error in pixels.
        maxIterations = maxIterations || 10;
        for (var i = 0; i < maxIterations; i++) {
            var b = layer.bounds; // [left, top, right, bottom]
            var renderedHeight = b[3].as("px") - b[1].as("px");
            var error = renderedHeight - targetHeight;
            if (Math.abs(error) <= tolerance) {
                break;
            }
            var currentSize = parseFloat(layer.textItem.size.as("px"));
            // Compute new size by scaling proportionally.
            var newSize = currentSize * (targetHeight / renderedHeight);
            // Update the font size and leading.
            layer.textItem.size = new UnitValue(newSize, "px");
            layer.textItem.leading = new UnitValue(newSize, "px");
            // (For paragraph text, Photoshop recalculates the text layout.)
        }
    }
    
    adjustFontSizeToFillVertical(textLayer, targetHeight, 0.5, 10);
    
    // ----- Step 10. Ensure horizontal boundaries are respected.
    // Check the rendered width of the text. If the right edge exceeds targetRight, reduce the font size.
    var horizIterations = 10;
    for (var j = 0; j < horizIterations; j++) {
        var bFinal = textLayer.bounds; // [left, top, right, bottom]
        var renderedWidth = bFinal[2].as("px") - bFinal[0].as("px");
        if (renderedWidth <= targetWidth) {
            break;
        }
        var currentSize = parseFloat(textLayer.textItem.size.as("px"));
        textLayer.textItem.size = new UnitValue(currentSize - 1, "px");
        textLayer.textItem.leading = new UnitValue(currentSize - 1, "px");
    }
    
    alert("Canvas resized, image repositioned, and text adjusted.\n" +
          "Target rectangle: Top " + targetTop + "px, Bottom " + targetBottom + "px, Left " + targetLeft + "px, Right " + targetRight + "px.");
})();
