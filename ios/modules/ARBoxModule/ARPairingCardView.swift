import UIKit

/// Compact floating card showing recommended chocolate + finish pairing for this variety.
class ARPairingCardView: UIView {

  private let chocolate: String
  private let finish: String
  private let varietyName: String

  private let accent = UIColor(red: 0.788, green: 0.592, blue: 0.227, alpha: 1)
  private let bg = UIColor(red: 0.969, green: 0.961, blue: 0.949, alpha: 0.95)
  private let mutedText = UIColor(red: 0.5, green: 0.47, blue: 0.44, alpha: 1)
  private let primaryText = UIColor(red: 0.13, green: 0.12, blue: 0.11, alpha: 1)

  init(chocolate: String, finish: String, varietyName: String) {
    self.chocolate = chocolate.isEmpty ? "Any" : chocolate
    self.finish = finish.isEmpty ? "Any" : finish
    self.varietyName = varietyName
    super.init(frame: .zero)
    backgroundColor = .clear
  }

  required init?(coder: NSCoder) { fatalError() }

  override func draw(_ rect: CGRect) {
    // Background
    let bgPath = UIBezierPath(roundedRect: rect, cornerRadius: 18)
    bg.setFill()
    bgPath.fill()
    UIColor.white.withAlphaComponent(0.6).setStroke()
    bgPath.lineWidth = 0.5
    bgPath.stroke()

    let pad: CGFloat = 16
    var y: CGFloat = pad

    // Header label
    let headerFont = UIFont.monospacedSystemFont(ofSize: 9, weight: .semibold)
    let headerAttrs: [NSAttributedString.Key: Any] = [.font: headerFont, .foregroundColor: mutedText]
    ("RECOMMENDED PAIRING" as NSString).draw(at: CGPoint(x: pad, y: y), withAttributes: headerAttrs)
    y += 16

    // Divider
    let divider = UIBezierPath()
    divider.move(to: CGPoint(x: pad, y: y))
    divider.addLine(to: CGPoint(x: rect.width - pad, y: y))
    UIColor.black.withAlphaComponent(0.08).setStroke()
    divider.lineWidth = 0.5
    divider.stroke()
    y += 8

    // Chocolate row
    let labelFont = UIFont.monospacedSystemFont(ofSize: 8, weight: .regular)
    let labelAttrs: [NSAttributedString.Key: Any] = [.font: labelFont, .foregroundColor: mutedText]
    ("CHOCOLATE" as NSString).draw(at: CGPoint(x: pad, y: y), withAttributes: labelAttrs)

    let valFont = UIFont.systemFont(ofSize: 13, weight: .medium)
    let valAttrs: [NSAttributedString.Key: Any] = [.font: valFont, .foregroundColor: primaryText]
    y += 12
    (chocolate.capitalized as NSString).draw(at: CGPoint(x: pad, y: y), withAttributes: valAttrs)
    y += 18

    // Finish row
    ("FINISH" as NSString).draw(at: CGPoint(x: pad, y: y), withAttributes: labelAttrs)
    y += 12
    (finish.capitalized as NSString).draw(at: CGPoint(x: pad, y: y), withAttributes: valAttrs)
    y += 18

    // Accent line at bottom
    let accentLine = UIBezierPath()
    accentLine.move(to: CGPoint(x: pad, y: rect.height - 10))
    accentLine.addLine(to: CGPoint(x: rect.width * 0.5, y: rect.height - 10))
    accent.withAlphaComponent(0.4).setStroke()
    accentLine.lineWidth = 1.5
    accentLine.stroke()
  }
}
