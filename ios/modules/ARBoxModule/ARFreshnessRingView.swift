import UIKit

/// Circular progress ring showing days since harvest vs. optimal eating window (7 days).
/// Colour: green → amber → red as the box ages.
class ARFreshnessRingView: UIView {

  private let daysSinceHarvest: Int
  private let optimalDays: Int = 7

  private var accentColor: UIColor {
    let ratio = CGFloat(daysSinceHarvest) / CGFloat(optimalDays)
    if ratio <= 0.5 { return UIColor(red: 0.18, green: 0.72, blue: 0.36, alpha: 1) }   // green
    if ratio <= 0.85 { return UIColor(red: 0.788, green: 0.592, blue: 0.227, alpha: 1) } // amber
    return UIColor(red: 0.937, green: 0.267, blue: 0.267, alpha: 1)                      // red
  }

  init(harvestDateISO: String?) {
    if let iso = harvestDateISO, let date = ARFreshnessRingView.parseDate(iso) {
      let days = Calendar.current.dateComponents([.day], from: date, to: Date()).day ?? 0
      self.daysSinceHarvest = max(0, days)
    } else {
      self.daysSinceHarvest = 0
    }
    super.init(frame: .zero)
    backgroundColor = .clear
  }

  required init?(coder: NSCoder) { fatalError() }

  private static func parseDate(_ iso: String) -> Date? {
    let fmts = ["yyyy-MM-dd'T'HH:mm:ssZ", "yyyy-MM-dd'T'HH:mm:ss.SSSZ", "yyyy-MM-dd"]
    for fmt in fmts {
      let f = DateFormatter(); f.dateFormat = fmt
      if let d = f.date(from: iso) { return d }
    }
    return nil
  }

  override func draw(_ rect: CGRect) {
    guard let ctx = UIGraphicsGetCurrentContext() else { return }
    let bgColor = UIColor(red: 0.969, green: 0.961, blue: 0.949, alpha: 0.95)

    // Background
    let bg = UIBezierPath(roundedRect: rect, cornerRadius: rect.width / 2)
    bgColor.setFill()
    bg.fill()

    let center = CGPoint(x: rect.midX, y: rect.midY)
    let radius = min(rect.width, rect.height) / 2 - 8
    let lineWidth: CGFloat = 8

    // Track ring
    let trackPath = UIBezierPath(arcCenter: center, radius: radius,
                                  startAngle: -.pi / 2, endAngle: .pi * 1.5, clockwise: true)
    UIColor.black.withAlphaComponent(0.08).setStroke()
    trackPath.lineWidth = lineWidth
    trackPath.lineCapStyle = .round
    trackPath.stroke()

    // Progress ring
    let progress = min(1, CGFloat(daysSinceHarvest) / CGFloat(optimalDays))
    let endAngle = -.pi / 2 + (2 * .pi * progress)
    let progressPath = UIBezierPath(arcCenter: center, radius: radius,
                                     startAngle: -.pi / 2, endAngle: endAngle, clockwise: true)
    accentColor.setStroke()
    progressPath.lineWidth = lineWidth
    progressPath.lineCapStyle = .round
    progressPath.stroke()

    // Center text: days number
    let daysStr = "\(daysSinceHarvest)" as NSString
    let daysFont = UIFont.monospacedSystemFont(ofSize: 20, weight: .bold)
    let daysAttrs: [NSAttributedString.Key: Any] = [.font: daysFont, .foregroundColor: accentColor]
    let daysSize = daysStr.size(withAttributes: daysAttrs)
    daysStr.draw(at: CGPoint(x: center.x - daysSize.width / 2, y: center.y - daysSize.height * 0.65), withAttributes: daysAttrs)

    // "days old" label
    let labelStr = "days old" as NSString
    let labelFont = UIFont.monospacedSystemFont(ofSize: 7, weight: .regular)
    let labelAttrs: [NSAttributedString.Key: Any] = [.font: labelFont, .foregroundColor: UIColor(red: 0.5, green: 0.47, blue: 0.44, alpha: 1)]
    let labelSize = labelStr.size(withAttributes: labelAttrs)
    labelStr.draw(at: CGPoint(x: center.x - labelSize.width / 2, y: center.y + 2), withAttributes: labelAttrs)

    // Freshness status label below ring (if the view is tall enough)
    if rect.height > rect.width + 20 {
      let statusStr: NSString
      if daysSinceHarvest == 0 { statusStr = "JUST PICKED" }
      else if daysSinceHarvest <= 3 { statusStr = "PEAK FRESHNESS" }
      else if daysSinceHarvest <= 6 { statusStr = "EAT TODAY" }
      else { statusStr = "PAST PEAK" }
      let statusFont = UIFont.monospacedSystemFont(ofSize: 7, weight: .semibold)
      let statusAttrs: [NSAttributedString.Key: Any] = [.font: statusFont, .foregroundColor: accentColor]
      let statusSize = statusStr.size(withAttributes: statusAttrs)
      statusStr.draw(at: CGPoint(x: center.x - statusSize.width / 2, y: rect.height - 16), withAttributes: statusAttrs)
    }
  }
}
