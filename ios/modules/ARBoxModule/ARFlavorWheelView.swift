import UIKit

/// Renders a five-axis radar chart for a variety's flavor profile.
/// Axes: sweetness, acidity, aroma, texture, intensity (values 0–10).
class ARFlavorWheelView: UIView {

  private let sweetness: CGFloat
  private let acidity: CGFloat
  private let aroma: CGFloat
  private let texture: CGFloat
  private let intensity: CGFloat
  private let pairingText: String?

  private let accent = UIColor(red: 0.788, green: 0.592, blue: 0.227, alpha: 1) // #C9973A
  private let bgColor = UIColor(red: 0.969, green: 0.961, blue: 0.949, alpha: 0.95)
  private let axisLabels = ["SWEET", "ACID", "AROMA", "TEXTURE", "INTENSITY"]

  init(sweetness: CGFloat, acidity: CGFloat, aroma: CGFloat, texture: CGFloat, intensity: CGFloat, pairingText: String?) {
    self.sweetness = min(max(sweetness, 0), 10)
    self.acidity = min(max(acidity, 0), 10)
    self.aroma = min(max(aroma, 0), 10)
    self.texture = min(max(texture, 0), 10)
    self.intensity = min(max(intensity, 0), 10)
    self.pairingText = pairingText
    super.init(frame: .zero)
    backgroundColor = .clear
  }

  required init?(coder: NSCoder) { fatalError() }

  override func draw(_ rect: CGRect) {
    guard let ctx = UIGraphicsGetCurrentContext() else { return }

    // Background pill
    let bg = UIBezierPath(roundedRect: rect, cornerRadius: 22)
    bgColor.setFill()
    bg.fill()

    // Light border
    UIColor.white.withAlphaComponent(0.6).setStroke()
    bg.lineWidth = 1
    bg.stroke()

    let centerX = rect.width * 0.42
    let centerY = rect.height * 0.50
    let maxRadius: CGFloat = min(rect.width, rect.height) * 0.30

    let values: [CGFloat] = [sweetness, acidity, aroma, texture, intensity]
    let count = values.count
    let angleStep = (2 * CGFloat.pi) / CGFloat(count)
    let startAngle = -CGFloat.pi / 2  // top

    // Draw grid rings (3 levels)
    for level in 1...3 {
      let r = maxRadius * CGFloat(level) / 3
      let gridPath = UIBezierPath()
      for i in 0..<count {
        let angle = startAngle + CGFloat(i) * angleStep
        let x = centerX + r * cos(angle)
        let y = centerY + r * sin(angle)
        if i == 0 { gridPath.move(to: CGPoint(x: x, y: y)) }
        else { gridPath.addLine(to: CGPoint(x: x, y: y)) }
      }
      gridPath.close()
      UIColor.black.withAlphaComponent(0.07).setStroke()
      gridPath.lineWidth = 0.5
      gridPath.stroke()
    }

    // Draw axis lines
    for i in 0..<count {
      let angle = startAngle + CGFloat(i) * angleStep
      let endX = centerX + maxRadius * cos(angle)
      let endY = centerY + maxRadius * sin(angle)
      ctx.setStrokeColor(UIColor.black.withAlphaComponent(0.15).cgColor)
      ctx.setLineWidth(0.5)
      ctx.move(to: CGPoint(x: centerX, y: centerY))
      ctx.addLine(to: CGPoint(x: endX, y: endY))
      ctx.strokePath()
    }

    // Draw data polygon
    let dataPath = UIBezierPath()
    for i in 0..<count {
      let angle = startAngle + CGFloat(i) * angleStep
      let r = maxRadius * (values[i] / 10)
      let x = centerX + r * cos(angle)
      let y = centerY + r * sin(angle)
      if i == 0 { dataPath.move(to: CGPoint(x: x, y: y)) }
      else { dataPath.addLine(to: CGPoint(x: x, y: y)) }
    }
    dataPath.close()
    accent.withAlphaComponent(0.25).setFill()
    dataPath.fill()
    accent.setStroke()
    dataPath.lineWidth = 1.5
    dataPath.stroke()

    // Data points
    for i in 0..<count {
      let angle = startAngle + CGFloat(i) * angleStep
      let r = maxRadius * (values[i] / 10)
      let x = centerX + r * cos(angle)
      let y = centerY + r * sin(angle)
      let dotRect = CGRect(x: x - 3, y: y - 3, width: 6, height: 6)
      let dot = UIBezierPath(ovalIn: dotRect)
      accent.setFill()
      dot.fill()
    }

    // Axis labels
    let labelFont = UIFont.monospacedSystemFont(ofSize: 9, weight: .medium)
    let labelColor = UIColor(red: 0.5, green: 0.47, blue: 0.44, alpha: 1)
    let labelAttrs: [NSAttributedString.Key: Any] = [.font: labelFont, .foregroundColor: labelColor]
    let labelPad: CGFloat = 14

    for i in 0..<count {
      let angle = startAngle + CGFloat(i) * angleStep
      let labelDist = maxRadius + labelPad
      let lx = centerX + labelDist * cos(angle)
      let ly = centerY + labelDist * sin(angle)
      let label = axisLabels[i] as NSString
      let size = label.size(withAttributes: labelAttrs)
      let labelRect = CGRect(x: lx - size.width / 2, y: ly - size.height / 2, width: size.width, height: size.height)
      label.draw(in: labelRect, withAttributes: labelAttrs)
    }

    // Title
    let titleFont = UIFont.monospacedSystemFont(ofSize: 10, weight: .semibold)
    let titleAttrs: [NSAttributedString.Key: Any] = [.font: titleFont, .foregroundColor: UIColor(red: 0.13, green: 0.12, blue: 0.11, alpha: 1)]
    ("FLAVOR PROFILE" as NSString).draw(at: CGPoint(x: 16, y: 12), withAttributes: titleAttrs)

    // Pairing text (right column)
    if let pairing = pairingText {
      let pairingLabelFont = UIFont.monospacedSystemFont(ofSize: 8, weight: .regular)
      let pairingLabelColor = UIColor(red: 0.5, green: 0.47, blue: 0.44, alpha: 1)
      let pairingAttrs: [NSAttributedString.Key: Any] = [.font: pairingLabelFont, .foregroundColor: pairingLabelColor]
      ("PAIRS WITH" as NSString).draw(at: CGPoint(x: rect.width * 0.72, y: rect.height * 0.35), withAttributes: pairingAttrs)
      let pairingValFont = UIFont.systemFont(ofSize: 10, weight: .medium)
      let pairingValAttrs: [NSAttributedString.Key: Any] = [.font: pairingValFont, .foregroundColor: accent]
      let pairingStr = pairing as NSString
      let pairingSize = pairingStr.size(withAttributes: pairingValAttrs)
      let pairingRect = CGRect(
        x: rect.width * 0.72,
        y: rect.height * 0.35 + 14,
        width: rect.width * 0.24,
        height: pairingSize.height * 3
      )
      pairingStr.draw(in: pairingRect, withAttributes: pairingValAttrs)
    }
  }
}
