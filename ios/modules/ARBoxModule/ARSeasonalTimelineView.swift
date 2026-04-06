import UIKit

/// Horizontal bar showing the variety's season window against the full calendar year.
/// Current date is marked with a tick. Renders as UIView → texture for SCNPlane.
class ARSeasonalTimelineView: UIView {

  private let seasonStart: Date?
  private let seasonEnd: Date?
  private let varietyName: String

  private let accent = UIColor(red: 0.788, green: 0.592, blue: 0.227, alpha: 1)
  private let bg = UIColor(red: 0.969, green: 0.961, blue: 0.949, alpha: 0.95)
  private let mutedText = UIColor(red: 0.5, green: 0.47, blue: 0.44, alpha: 1)

  init(seasonStart: String?, seasonEnd: String?, varietyName: String) {
    self.seasonStart = seasonStart.flatMap(ARSeasonalTimelineView.parseDate)
    self.seasonEnd = seasonEnd.flatMap(ARSeasonalTimelineView.parseDate)
    self.varietyName = varietyName
    super.init(frame: .zero)
    backgroundColor = .clear
  }

  required init?(coder: NSCoder) { fatalError() }

  private static func parseDate(_ s: String) -> Date? {
    let fmts = ["yyyy-MM-dd'T'HH:mm:ssZ", "yyyy-MM-dd'T'HH:mm:ss.SSSZ", "yyyy-MM-dd"]
    for fmt in fmts {
      let f = DateFormatter(); f.dateFormat = fmt
      if let d = f.date(from: s) { return d }
    }
    return nil
  }

  /// Returns fraction 0–1 for a date within the calendar year (Jan 1 = 0, Dec 31 = 1).
  private static func yearFraction(_ date: Date) -> CGFloat {
    let cal = Calendar.current
    let year = cal.component(.year, from: date)
    let jan1 = cal.date(from: DateComponents(year: year, month: 1, day: 1))!
    let dec31 = cal.date(from: DateComponents(year: year, month: 12, day: 31))!
    let total = dec31.timeIntervalSince(jan1)
    return CGFloat(date.timeIntervalSince(jan1) / total)
  }

  override func draw(_ rect: CGRect) {
    // Background
    let bgPath = UIBezierPath(roundedRect: rect, cornerRadius: 16)
    bg.setFill()
    bgPath.fill()
    UIColor.white.withAlphaComponent(0.6).setStroke()
    bgPath.lineWidth = 0.5
    bgPath.stroke()

    let pad: CGFloat = 14
    let barY: CGFloat = rect.height * 0.52
    let barHeight: CGFloat = 8
    let barLeft = pad
    let barRight = rect.width - pad
    let barWidth = barRight - barLeft

    // Header
    let headerFont = UIFont.monospacedSystemFont(ofSize: 9, weight: .semibold)
    let headerAttrs: [NSAttributedString.Key: Any] = [.font: headerFont, .foregroundColor: mutedText]
    ("SEASON WINDOW" as NSString).draw(at: CGPoint(x: pad, y: 10), withAttributes: headerAttrs)

    // Track
    let track = UIBezierPath(roundedRect: CGRect(x: barLeft, y: barY, width: barWidth, height: barHeight), cornerRadius: 4)
    UIColor.black.withAlphaComponent(0.08).setFill()
    track.fill()

    // Season fill
    if let start = seasonStart, let end = seasonEnd {
      let startFrac = ARSeasonalTimelineView.yearFraction(start)
      let endFrac = ARSeasonalTimelineView.yearFraction(end)
      let fillX = barLeft + startFrac * barWidth
      let fillW = (endFrac - startFrac) * barWidth
      if fillW > 0 {
        let fill = UIBezierPath(roundedRect: CGRect(x: fillX, y: barY, width: fillW, height: barHeight), cornerRadius: 4)
        accent.withAlphaComponent(0.85).setFill()
        fill.fill()
      }

      // Date labels
      let dateFont = UIFont.monospacedSystemFont(ofSize: 7, weight: .regular)
      let dateAttrs: [NSAttributedString.Key: Any] = [.font: dateFont, .foregroundColor: mutedText]
      let df = DateFormatter(); df.dateFormat = "MMM d"

      let startLabel = df.string(from: start) as NSString
      let endLabel = df.string(from: end) as NSString
      startLabel.draw(at: CGPoint(x: fillX, y: barY + barHeight + 4), withAttributes: dateAttrs)
      let endLabelSize = endLabel.size(withAttributes: dateAttrs)
      endLabel.draw(at: CGPoint(x: fillX + fillW - endLabelSize.width, y: barY + barHeight + 4), withAttributes: dateAttrs)
    }

    // Today tick
    let todayFrac = ARSeasonalTimelineView.yearFraction(Date())
    let tickX = barLeft + todayFrac * barWidth
    let tickPath = UIBezierPath()
    tickPath.move(to: CGPoint(x: tickX, y: barY - 4))
    tickPath.addLine(to: CGPoint(x: tickX, y: barY + barHeight + 4))
    UIColor(red: 0.13, green: 0.12, blue: 0.11, alpha: 0.8).setStroke()
    tickPath.lineWidth = 1.5
    tickPath.stroke()

    // Month labels
    let monthFont = UIFont.monospacedSystemFont(ofSize: 6, weight: .regular)
    let monthAttrs: [NSAttributedString.Key: Any] = [.font: monthFont, .foregroundColor: UIColor.black.withAlphaComponent(0.25)]
    let shortMonths = ["J","F","M","A","M","J","J","A","S","O","N","D"]
    for (i, abbr) in shortMonths.enumerated() {
      let frac = CGFloat(i) / 12.0
      let mx = barLeft + frac * barWidth
      (abbr as NSString).draw(at: CGPoint(x: mx - 2, y: barY - 14), withAttributes: monthAttrs)
    }
  }
}
