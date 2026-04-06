import UIKit

/// AR card view for fraise.market vendor stalls.
/// Rendered to a UIImage and applied as an SCNPlane texture in ARBoxViewController.
class ARMarketStallCardView: UIView {

  init(stallData: NSDictionary) {
    super.init(frame: .zero)
    backgroundColor = UIColor(red: 0.969, green: 0.961, blue: 0.949, alpha: 0.94) // #F7F5F2
    layer.cornerRadius = 20
    layer.masksToBounds = true
    buildUI(stallData: stallData)
  }

  required init?(coder: NSCoder) { fatalError() }

  private func buildUI(stallData: NSDictionary) {
    let vendorName = (stallData["vendor_name"] as? String) ?? "Vendor"
    let description = stallData["description"] as? String
    let instagram = stallData["instagram"] as? String
    let listingsRaw = stallData["listings"] as? [[String: Any]] ?? []

    let stack = UIStackView()
    stack.axis = .vertical
    stack.spacing = 10
    stack.layoutMargins = UIEdgeInsets(top: 20, left: 24, bottom: 20, right: 24)
    stack.isLayoutMarginsRelativeArrangement = true
    stack.translatesAutoresizingMaskIntoConstraints = false
    addSubview(stack)
    NSLayoutConstraint.activate([
      stack.topAnchor.constraint(equalTo: topAnchor),
      stack.leadingAnchor.constraint(equalTo: leadingAnchor),
      stack.trailingAnchor.constraint(equalTo: trailingAnchor),
      stack.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])

    // Vendor name — Playfair-style (system serif fallback)
    let nameLabel = UILabel()
    nameLabel.text = vendorName
    nameLabel.font = UIFont(name: "Georgia-Bold", size: 20) ?? UIFont.systemFont(ofSize: 20, weight: .bold)
    nameLabel.textColor = UIColor(red: 0.13, green: 0.12, blue: 0.11, alpha: 1)
    nameLabel.numberOfLines = 1
    stack.addArrangedSubview(nameLabel)

    // Instagram handle
    if let ig = instagram, !ig.isEmpty {
      let igLabel = makeMonoLabel(text: "@\(ig)", size: 11,
                                  color: UIColor(red: 0.5, green: 0.47, blue: 0.44, alpha: 1))
      stack.addArrangedSubview(igLabel)
    }

    // Divider
    let divider = UIView()
    divider.backgroundColor = UIColor(red: 0.85, green: 0.83, blue: 0.80, alpha: 1)
    divider.heightAnchor.constraint(equalToConstant: 0.5).isActive = true
    stack.addArrangedSubview(divider)

    // Description (up to 2 lines)
    if let desc = description, !desc.isEmpty {
      let descLabel = UILabel()
      descLabel.text = desc
      descLabel.font = UIFont(name: "DMSans-Regular", size: 12) ?? UIFont.systemFont(ofSize: 12)
      descLabel.textColor = UIColor(red: 0.33, green: 0.31, blue: 0.28, alpha: 1)
      descLabel.numberOfLines = 2
      stack.addArrangedSubview(descLabel)
    }

    // Listings — up to 3
    for listing in listingsRaw.prefix(3) {
      let name = (listing["name"] as? String) ?? ""
      let priceCents = (listing["price_cents"] as? NSNumber)?.intValue ?? 0
      let unitLabel = (listing["unit_label"] as? String) ?? "each"
      let stock = (listing["stock_quantity"] as? NSNumber)?.intValue ?? 0
      let tags = listing["tags"] as? [String] ?? []

      let priceFormatted = String(format: "CA$%.2f", Double(priceCents) / 100.0)
      let listingText = "\(name)  ·  \(priceFormatted)/\(unitLabel)  ·  \(stock) left"

      let listingLabel = makeMonoLabel(text: listingText, size: 11,
                                       color: UIColor(red: 0.33, green: 0.31, blue: 0.28, alpha: 1))
      stack.addArrangedSubview(listingLabel)

      // Tag pills
      if !tags.isEmpty {
        let tagRow = UIStackView()
        tagRow.axis = .horizontal
        tagRow.spacing = 5
        tagRow.alignment = .leading
        for tag in tags.prefix(3) {
          let pill = makeTagPill(text: tag)
          tagRow.addArrangedSubview(pill)
        }
        stack.addArrangedSubview(tagRow)
      }
    }

    // Spacer
    let spacer = UIView()
    spacer.setContentHuggingPriority(.defaultLow, for: .vertical)
    stack.addArrangedSubview(spacer)

    // Footer: "fraise.market" in accent color
    let footerLabel = makeMonoLabel(text: "fraise.market", size: 11,
                                    color: UIColor(red: 0.788, green: 0.592, blue: 0.227, alpha: 1))
    footerLabel.textAlignment = .right
    stack.addArrangedSubview(footerLabel)
  }

  // MARK: - Helpers

  private func makeMonoLabel(text: String, size: CGFloat, color: UIColor) -> UILabel {
    let label = UILabel()
    label.text = text
    label.font = UIFont.monospacedSystemFont(ofSize: size, weight: .regular)
    label.textColor = color
    label.numberOfLines = 1
    return label
  }

  private func makeTagPill(text: String) -> UIView {
    let container = UIView()
    container.backgroundColor = UIColor(red: 0.85, green: 0.83, blue: 0.80, alpha: 1)
    container.layer.cornerRadius = 7
    let label = UILabel()
    label.text = text
    label.font = UIFont.monospacedSystemFont(ofSize: 9, weight: .regular)
    label.textColor = UIColor(red: 0.33, green: 0.31, blue: 0.28, alpha: 1)
    label.translatesAutoresizingMaskIntoConstraints = false
    container.addSubview(label)
    NSLayoutConstraint.activate([
      label.topAnchor.constraint(equalTo: container.topAnchor, constant: 3),
      label.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 7),
      label.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -7),
      label.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -3),
    ])
    return container
  }
}
